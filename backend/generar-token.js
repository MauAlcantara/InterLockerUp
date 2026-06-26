const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({ id: 5 }, process.env.JWT_SECRET, { expiresIn: '1h' });
console.log(token);

