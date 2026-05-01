import { currencyService } from "./currency.service.js";

export const currencyController = {
  async rates(_request, response) {
    try {
      const result = await currencyService.getRates();
      response.json(result);
    } catch (_error) {
      response.status(503).json({
        message: "CURRENCY_RATES_UNAVAILABLE"
      });
    }
  }
};
