const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { JWT_SECRET } = process.env;
const auth = require('../controllers/auth.controllers');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let restrict = (req, res, next) => {
    let { authorization } = req.headers;
    if (!authorization || !authorization.split(' ')[1]) {
        return res.status(401).json({
            status: false,
            message: 'token not provided!',
            data: null
        });
    }

    let token = authorization.split(' ')[1];
    jwt.verify(token, JWT_SECRET, async (err, data) => {
        if (err) {
            return res.status(401).json({
                status: false,
                message: err.message,
                data: null
            });
        }

        let user = await prisma.user.findFirst({
            where: { id: data.id }
        });
        delete user.password;
        req.user = user;
        next();
    });
};

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/user-login', (req, res) => {
    res.render('login');
});
router.get('/whoami', restrict, auth.whoami);
router.get('/users', restrict, auth.getUsers);

router.get('/view-change-pass', (req, res) => {
    let { token } = req.query;
    res.render('reset-password', { token });
});

router.post('/changePassword', auth.changePassword);
router.post('/check-email', auth.requestChangePassword);
router.get('/view-change', (req, res) => res.render('check-email'));
router.get('/view-register', (req, res) => res.render('register'));
router.get('/verify', auth.changePassword);
router.get('/notifications', restrict, async (req, res) => {
    const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
    });
    res.render('notifications', { userID: req.user.id, notifications });
});

module.exports = router;
