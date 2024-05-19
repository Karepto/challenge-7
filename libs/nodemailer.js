let nodemailer = require('nodemailer');
let { google } = require('googleapis');
let ejs = require('ejs');

const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN
} = process.env;

let oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
);
oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

module.exports = {
    sendMail: async (to, subject, html) => {
        try {
            let accessToken = await oauth2Client.getAccessToken();
            let transport = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: 'renggadwipribadi@gmail.com',
                    clientId: GOOGLE_CLIENT_ID,
                    clientSecret: GOOGLE_CLIENT_SECRET,
                    refreshToken: GOOGLE_REFRESH_TOKEN,
                    accessToken: accessToken
                }
            });

            transport.sendMail({ to, subject, html });
        } catch (error) {
            console.log(error);
        }
    },

    getHTML: (fileName, data) => {
        return new Promise((resolve, reject) => {
            const path = `${__dirname}/../views/templates/${fileName}`;
            ejs.renderFile(path, data, (err, data) => {
                if (err) {
                    return reject(err);
                }
                return resolve(data);
            });
        });
    }
};