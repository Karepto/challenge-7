let io;

module.exports = {
    init: (server) => {
        const { Server } = require('socket.io');
        io = new Server(server);
        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};