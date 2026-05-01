import { assistantService } from "./assistant.service.js";

export const assistantController = {
  async analyze(request, response) {
    const result = await assistantService.analyze(request.body.text || "");
    response.json(result);
  }
};
