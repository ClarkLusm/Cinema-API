const crypto = require("crypto");

const db = require("../config/db.config");
const OrderRepo = require("../repositories/OrderRepository");
const PaymentRepo = require("../repositories/PaymentRepository");
const OnePayTransactionRepo = require("../repositories/OnePayTransactionRepository");
const UserRepo = require("../repositories/UserRepository");
const {
  buildTicketPayload,
  generateTicketCode,
} = require("../utils/CheckoutUtil");

const ONEPAY_PAYMENT_URL =
  process.env.ONEPAY_PAYMENT_URL || "https://mtf.onepay.vn/paygate/vpcpay.op";
const ONEPAY_MERCHANT = process.env.ONEPAY_MERCHANT || "TESTONEPAY";
const ONEPAY_ACCESS_CODE = process.env.ONEPAY_ACCESS_CODE || "6BEB2546";
const ONEPAY_SECURE_SECRET =
  process.env.ONEPAY_SECURE_SECRET || "6D0870CDE5D40475";
const DEFAULT_FRONTEND_URL =
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const DEFAULT_BACKEND_URL =
  (process.env.BACKEND_PUBLIC_URL || "http://localhost:5000").replace(/\/+$/, "");
const ONEPAY_RETURN_PATH = "/api/onepay/return";
const ONEPAY_IPN_PATH = "/api/onepay/ipn";

const ONEPAY_RESPONSE_MESSAGES = {
  "0": "Giao dich thanh cong",
  "1": "Ngan hang tu choi giao dich",
  "3": "Merchant khong ton tai",
  "4": "Access code khong hop le",
  "5": "So tien khong hop le",
  "6": "Ma don hang khong hop le",
  "7": "Loi khong xac dinh",
  "8": "So the khong dung",
  "9": "Ten chu the khong dung",
  A: "The het han",
  D: "Giao dich bi tu choi",
  F: "Giao dich dang duoc xu ly",
  I: "Dia chi IP bi tu choi",
  N: "The khong ho tro",
  P: "Giao dich da duoc thanh toan",
  R: "Giao dich bi hold review",
  S: "Ngan hang dang bao tri",
  T: "Giao dich khong hop le",
  U: "Don hang khong ton tai",
  V: "Xac thuc secure hash that bai",
  "99": "Loi khong xac dinh tu cong thanh toan",
};

const getResponseMessage = (code) =>
  ONEPAY_RESPONSE_MESSAGES[code] || "Khong xac dinh";

const padAmount = (amount) => String(Math.round(Number(amount) * 100));

const buildClientIp = (candidate) => {
  if (!candidate) {
    return "127.0.0.1";
  }

  const normalizedCandidate = String(candidate).split(",")[0]?.trim() || "127.0.0.1";

  if (normalizedCandidate === "::1" || normalizedCandidate === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }

  if (normalizedCandidate.startsWith("::ffff:")) {
    return normalizedCandidate.replace("::ffff:", "");
  }

  return normalizedCandidate;
};

const sortParams = (params) =>
  Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

const encodeParams = (params) => new URLSearchParams(params).toString();

const buildSecureHash = (params) => {
  const hashData = encodeParams(sortParams(params));

  return crypto
    .createHmac("sha256", Buffer.from(ONEPAY_SECURE_SECRET, "utf8"))
    .update(hashData, "utf8")
    .digest("hex")
    .toUpperCase();
};

const buildGatewayUrl = (params) => {
  const secureHash = buildSecureHash(params);
  const query = encodeParams({
    ...sortParams(params),
    vpc_SecureHash: secureHash,
  });

  return `${ONEPAY_PAYMENT_URL}?${query}`;
};

const sanitizeIncomingParams = (query) =>
  Object.entries(query).reduce((result, [key, value]) => {
    if (typeof value === "string") {
      result[key] = value;
    }
    return result;
  }, {});

const verifyIncomingHash = (params) => {
  const incomingHash = params.vpc_SecureHash || params.secureHash || "";
  const signedParams = Object.keys(params).reduce((result, key) => {
    if (
      (key.startsWith("vpc_") || key.startsWith("user_")) &&
      key !== "vpc_SecureHash" &&
      key !== "vpc_SecureHashType"
    ) {
      result[key] = params[key];
    }

    return result;
  }, {});

  const computedHash = buildSecureHash(signedParams);
  const hashValid =
    incomingHash.length > 0 &&
    incomingHash.length === computedHash.length &&
    crypto.timingSafeEqual(
      Buffer.from(incomingHash.toUpperCase()),
      Buffer.from(computedHash.toUpperCase())
    );

  return { hashValid, computedHash };
};

const createMerchTxnRef = (orderId) =>
  `ORD${orderId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

const normalizeOnePayPaymentPayload = (transaction) => {
  if (!transaction) {
    return null;
  }

  return {
    id: transaction.id,
    merchTxnRef: transaction.merch_txn_ref,
    orderId: transaction.order_id,
    bookingId: transaction.booking_id,
    status: String(transaction.status || "").toLowerCase(),
    amount: Number(transaction.amount || 0),
    provider: "onepay",
    paymentUrl: transaction.gateway_url || null,
    transactionNo: transaction.transaction_no || null,
    gatewayResponseCode: transaction.response_code || null,
    gatewayMessage: transaction.message || null,
    secureHashValid: Boolean(transaction.secure_hash_valid),
    paidAt: transaction.paid_at || null,
    createdAt: transaction.created_at || null,
    updatedAt: transaction.updated_at || null,
  };
};

const ensureOrderOwnership = async (orderId, userId) => {
  const order = await OrderRepo.getOrderById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (userId && order.user_id !== userId) {
    throw new Error("You cannot access this order");
  }

  return order;
};

const finalizeSuccessfulOrder = async (order, paymentId, transactionNo, responseCode, message, executor) => {
  if (order.status === "PAID") {
    if (paymentId) {
      await PaymentRepo.updatePaymentMetadata(
        paymentId,
        {
          status: "SUCCESS",
          gatewayTransactionNo: transactionNo,
          responseCode,
          message,
        },
        executor
      );
      await PaymentRepo.updatePaymentStatus(
        paymentId,
        "SUCCESS",
        transactionNo,
        executor
      );
    }
    return null;
  }

  const seatIds = JSON.parse(order.seat_ids_json || "[]");

  if (!seatIds.length) {
    throw new Error("Order has no seats");
  }

  const validSeats = await OrderRepo.getValidHeldSeats(
    order.user_id,
    order.showtime_id,
    seatIds
  );

  if (validSeats.length !== seatIds.length) {
    throw new Error("Seats not valid or expired");
  }

  const showTime = await OrderRepo.getShowTimeById(order.showtime_id);
  const seats = await OrderRepo.getSeatDetails(order.showtime_id, seatIds);
  const customer = await UserRepo.getById(order.user_id);
  const ticketCode = generateTicketCode(order.id);
  const ticket = buildTicketPayload({
    ticketCode,
    bookingCode: order.booking_code,
    orderId: order.id,
    userId: order.user_id,
    showTime,
    seats,
    customer,
  });

  await OrderRepo.updateSeatsToBooked(
    order.user_id,
    order.showtime_id,
    seatIds,
    executor
  );
  await OrderRepo.markOrderAsPaid(
    order.id,
    ticketCode,
    ticket.qrData,
    executor
  );

  if (paymentId) {
    await PaymentRepo.updatePaymentMetadata(
      paymentId,
      {
        status: "SUCCESS",
        gatewayTransactionNo: transactionNo,
        responseCode,
        message,
      },
      executor
    );
    await PaymentRepo.updatePaymentStatus(
      paymentId,
      "SUCCESS",
      transactionNo,
      executor
    );
  }

  return ticket;
};

const syncTransactionResult = async (transaction, params, source) => {
  const merchTxnRef = transaction?.merch_txn_ref;

  if (!merchTxnRef) {
    throw new Error("OnePay transaction not found");
  }

  const { hashValid } = verifyIncomingHash(params);
  const responseCode = params.vpc_TxnResponseCode || params.txnResponseCode || "99";
  const success = hashValid && responseCode === "0";
  const mappedStatus = success ? "PAID" : responseCode === "F" ? "PENDING" : "FAILED";
  const message = getResponseMessage(responseCode);
  const transactionNo = params.vpc_TransactionNo || null;
  const rawQuery = JSON.stringify(params);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await OnePayTransactionRepo.updateTransaction(
      merchTxnRef,
      {
        status: mappedStatus,
        responseCode,
        transactionNo,
        message,
        secureHashValid: hashValid ? 1 : 0,
        returnQuery: source === "return" ? rawQuery : null,
        ipnQuery: source === "ipn" ? rawQuery : null,
        paidAt: success ? new Date() : null,
      },
      connection
    );

    const payment =
      (await PaymentRepo.getPaymentByMerchTxnRef(merchTxnRef)) ||
      (await PaymentRepo.getPendingPaymentByOrderId(transaction.order_id));

    if (success) {
      const order = await OrderRepo.getOrderById(transaction.order_id);
      await finalizeSuccessfulOrder(
        order,
        payment?.id || null,
        transactionNo,
        responseCode,
        message,
        connection
      );
    } else {
      await OrderRepo.updateOrderStatus(
        transaction.order_id,
        mappedStatus === "FAILED" ? "FAILED" : "PENDING",
        connection
      );

      if (payment) {
        await PaymentRepo.updatePaymentMetadata(
          payment.id,
          {
            status: mappedStatus === "FAILED" ? "FAILED" : "PENDING",
            gatewayTransactionNo: transactionNo,
            responseCode,
            message,
          },
          connection
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const nextTransaction = await OnePayTransactionRepo.getByMerchTxnRef(merchTxnRef);

  return {
    transaction: nextTransaction,
    hashValid,
    responseCode,
    success,
    message,
  };
};

exports.createCheckout = async (payload, requestMeta = {}, userId) => {
  const orderId = Number(payload.orderId);
  const amount = Math.round(Number(payload.amount));
  const locale = payload.locale === "en" ? "en" : "vn";
  const cardList = ["INTERNATIONAL", "DOMESTIC", "QR"].includes(payload.cardList)
    ? payload.cardList
    : null;
  const orderInfo = String(payload.orderInfo || "").trim();

  if (!orderId || !amount || !orderInfo) {
    throw new Error("Missing required fields");
  }

  const order = await ensureOrderOwnership(orderId, userId);
  const merchTxnRef = createMerchTxnRef(orderId);
  const bookingId = Number(payload.bookingId || order.id);
  const clientIp = buildClientIp(requestMeta.clientIp);
  const returnBaseUrl =
    typeof payload.returnBaseUrl === "string" && payload.returnBaseUrl.trim()
      ? payload.returnBaseUrl.replace(/\/+$/, "")
      : DEFAULT_FRONTEND_URL;

  if (
    DEFAULT_BACKEND_URL.includes("localhost") ||
    DEFAULT_BACKEND_URL.includes("127.0.0.1")
  ) {
    throw new Error("OnePay requires a public backend return/callback URL. Please configure BACKEND_PUBLIC_URL with a reachable domain or tunnel.");
  }

  const onePayParams = {
    Title: "Cinema Checkout",
    vpc_AccessCode: ONEPAY_ACCESS_CODE,
    vpc_Amount: padAmount(amount),
    vpc_Command: "pay",
    vpc_Currency: "VND",
    vpc_Locale: locale,
    vpc_MerchTxnRef: merchTxnRef,
    vpc_Merchant: ONEPAY_MERCHANT,
    vpc_OrderInfo: orderInfo,
    vpc_ReturnURL: `${DEFAULT_BACKEND_URL}${ONEPAY_RETURN_PATH}?redirect=${encodeURIComponent(
      `${returnBaseUrl}/payment/onepay/result`
    )}`,
    vpc_CallbackURL: `${DEFAULT_BACKEND_URL}${ONEPAY_IPN_PATH}`,
    vpc_TicketNo: clientIp,
    vpc_Version: "2",
  };

  if (cardList) {
    onePayParams.vpc_CardList = cardList;
  }

  const paymentUrl = buildGatewayUrl(onePayParams);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let payment = await PaymentRepo.getPendingPaymentByOrderId(orderId);

    if (payment) {
      await PaymentRepo.updatePaymentMetadata(
        payment.id,
        {
          amount,
          provider: "onepay",
          currency: "VND",
          status: "PENDING",
          merchTxnRef,
          message: orderInfo,
        },
        connection
      );
    } else {
      const paymentId = await PaymentRepo.createPayment(
        orderId,
        amount,
        "onepay",
        connection
      );

      await PaymentRepo.updatePaymentMetadata(
        paymentId,
        {
          currency: "VND",
          status: "PENDING",
          merchTxnRef,
          message: orderInfo,
        },
        connection
      );
    }

    await OnePayTransactionRepo.createTransaction(
      {
        merchTxnRef,
        orderId,
        bookingId,
        amount,
        locale,
        clientIp,
        status: "PENDING",
        gatewayUrl: paymentUrl,
        message: orderInfo,
      },
      connection
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const transaction = await OnePayTransactionRepo.getByMerchTxnRef(merchTxnRef);

  return {
    payment: normalizeOnePayPaymentPayload(transaction),
    paymentUrl,
    merchTxnRef,
    provider: "onepay",
    order: {
      id: order.id,
      bookingCode: order.booking_code,
      totalPrice: Number(order.total_price || amount),
      status: String(order.status || "").toLowerCase(),
    },
  };
};

exports.handleGatewayReturn = async (query) => {
  const params = sanitizeIncomingParams(query);
  const merchTxnRef = params.vpc_MerchTxnRef || "";

  if (!merchTxnRef) {
    return {
      transaction: null,
      hashValid: false,
      responseCode: "99",
      success: false,
      message: "Khong tim thay ma giao dich",
    };
  }

  const transaction = await OnePayTransactionRepo.getByMerchTxnRef(merchTxnRef);

  if (!transaction) {
    return {
      transaction: null,
      hashValid: false,
      responseCode: "99",
      success: false,
      message: "OnePay transaction not found",
    };
  }

  return syncTransactionResult(transaction, params, "return");
};

exports.handleIpn = async (query) => {
  const params = sanitizeIncomingParams(query);
  const merchTxnRef = params.vpc_MerchTxnRef || "";

  if (!merchTxnRef) {
    return {
      responseText: "responsecode=1&desc=missing-merch-txn-ref",
      payload: null,
    };
  }

  const transaction = await OnePayTransactionRepo.getByMerchTxnRef(merchTxnRef);

  if (!transaction) {
    return {
      responseText: "responsecode=1&desc=missing-transaction",
      payload: null,
    };
  }

  const payload = await syncTransactionResult(transaction, params, "ipn");

  return {
    responseText: payload.hashValid
      ? "responsecode=1&desc=confirm-success"
      : "responsecode=0&desc=invalid-hash",
    payload,
  };
};

exports.getPaymentByTxnRef = async (merchTxnRef, userId) => {
  const transaction = await OnePayTransactionRepo.getByMerchTxnRef(merchTxnRef);

  if (!transaction) {
    throw new Error("OnePay transaction not found");
  }

  await ensureOrderOwnership(transaction.order_id, userId);
  return normalizeOnePayPaymentPayload(transaction);
};

exports.getPaymentByOrderId = async (orderId, userId) => {
  await ensureOrderOwnership(orderId, userId);

  const transaction = await OnePayTransactionRepo.getByOrderId(orderId);

  if (!transaction) {
    throw new Error("OnePay transaction not found");
  }

  return normalizeOnePayPaymentPayload(transaction);
};

exports.buildReturnRedirectUrl = (redirectBaseUrl, payload) => {
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.set(key, String(value));
    }
  });

  return `${redirectBaseUrl}?${params.toString()}`;
};
