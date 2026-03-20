const jwt = require("jsonwebtoken");

exports.generateToken = (payload)=>{

  return jwt.sign(payload,process.env.ACTIVATION_SECRET,{
    expiresIn:process.env.ACTIVATION_EXPIRES
  });

};

exports.verifyToken = (token)=>{
  return jwt.verify(token,process.env.ACTIVATION_SECRET);
};