const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getHTML, sendMail } = require('../libs/nodemailer');
const { JWT_SECRET } = process.env;

const addNotification = async (userId, title, body) => {
    await prisma.notification.create({
        data: {
            userId,
            title,
            body,
        },
    });
};

const sendNotification = async (io, userId) => {
    let notifications = await prisma.notification.findMany({ where: { userId } });
    io.to(`user-${userId}`).emit('notification', notifications);
};

module.exports = {
    register: async (req, res, next) => {
        try {
            const { name, email, password, role } = req.body;
            if (!name || !email || !password) {
                return res.status(400).send('<h1>Name, email, and password are required</h1>');
            }

            const userExist = await prisma.user.findFirst({ where: { email } });
            if (userExist) {
                return res.status(400).send('<h1>Email has already been used</h1>');
            }

            const encryptedPassword = await bcrypt.hash(password, 10);
            const userData = {
                name,
                email,
                password: encryptedPassword,
                ...(role && { role }),
            };
            const user = await prisma.user.create({ data: userData });
            delete user.password;

            const io = req.app.get('io');
            await addNotification(user.id, 'Welcome!', 'Thank you for registering with us.');
            await sendNotification(io, user.id);

            return res.status(201).send('<h1>User registered</h1>');
        } catch (error) {
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).send('<h1>Email and password are required!</h1>');
            }

            const user = await prisma.user.findFirst({ where: { email } });
            if (!user) {
                return res.status(400).send('<h1>Invalid email or password!</h1>');
            }

            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).send('<h1>Invalid email or password!</h1>');
            }

            delete user.password;
            const token = jwt.sign({ id: user.id }, JWT_SECRET);

            res.render('notifications', {
                userID: user.id,
                notifications: await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
            });
        } catch (error) {
            next(error);
        }
    },

    whoami: async (req, res, next) => {
        try {
            res.json({
                status: true,
                message: 'OK',
                data: req.user,
            });
        } catch (error) {
            next(error);
        }
    },

    changePassword: async (req, res, next) => {
        try {
            const { token } = req.query;
            const { newPassword, passwordConfirmation } = req.body;

            if (!newPassword || !passwordConfirmation) {
                return res.status(400).send('<h1>Both password fields are required</h1>');
            }

            if (newPassword !== passwordConfirmation) {
                return res.status(400).send('<h1>Passwords do not match</h1>');
            }

            jwt.verify(token, JWT_SECRET, async (err, decoded) => {
                if (err) {
                    return res.status(400).send('<h1>Failed to Verify</h1>');
                }

                const userId = decoded.userId;
                if (!userId) {
                    return res.status(400).send('<h1>Invalid token</h1>');
                }

                const hashedPassword = await bcrypt.hash(newPassword, 10);
                const user = await prisma.user.update({
                    where: { id: userId },
                    data: { password: hashedPassword },
                });

                const io = req.app.get('io');
                await addNotification(user.id, 'Password Changed', 'Your password has been changed successfully.');
                await sendNotification(io, user.id);

                res.send('<h1>Password Updated Successfully</h1>');
            });
        } catch (error) {
            next(error);
        }
    },

    requestChangePassword: async (req, res, next) => {
        try {
            const { email } = req.body;
            const user = await prisma.user.findFirst({ where: { email } });
            if (!user) {
                return res.status(400).json({ msg: 'User not found' });
            }

            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
            const url = `${req.protocol}://${req.get('host')}/api/v1/view-change-pass?token=${token}`;
            const html = await getHTML('verification-code.ejs', { name: user.name, verification_url: url });

            await sendMail(user.email, 'Change Password', html);
            return res.json({
                status: true,
                message: 'Success',
                data: null,
            });
        } catch (error) {
            next(error);
        }
    },

    getUsers: async (req, res, next) => {
        try {
            const { page = 1, limit = 10, search } = req.query;
            const whereQuery = search ? { name: { contains: search } } : {};

            const users = await prisma.user.findMany({
                skip: (page - 1) * Number(limit),
                take: Number(limit),
                where: whereQuery,
            });

            const count = await prisma.user.count({ where: whereQuery });

            return res.json({
                status: true,
                message: 'Success',
                data: {
                    count,
                    users,
                },
            });
        } catch (error) {
            next(error);
        }
    },
};
