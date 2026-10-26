// Erro com status HTTP, tratado pelo errorHandler global
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
