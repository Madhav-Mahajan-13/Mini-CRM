module.exports = (req, res, next) => {
    // Example middleware logic
    console.log('Middleware executed');
    next();
};
