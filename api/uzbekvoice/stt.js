import { buffer } from "node:stream/consumers";

export const config = {
  api: {
    bodyParser: false
  }
};

const buildHeaders = (headers, bodyLength) => {
  const authorization = headers.authorization || process.env.UZBEKVOICE_API_KEY || "";
  const nextHeaders = {
    Accept: "application/json"
  };

  if (authorization) {
    nextHeaders.Authorization = authorization;
  }
  if (headers["content-type"]) {
    nextHeaders["Content-Type"] = headers["content-type"];
  }
  if (bodyLength) {
    nextHeaders["Content-Length"] = String(bodyLength);
  }

  return nextHeaders;
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "METHOD_NOT_ALLOWED" });
  }

  if (!request.headers.authorization && !process.env.UZBEKVOICE_API_KEY) {
    return response.status(500).json({ message: "UZBEKVOICE_SERVER_KEY_MISSING" });
  }

  try {
    const body = await buffer(request);

    const upstream = await fetch("https://uzbekvoice.ai/api/v1/stt", {
      method: "POST",
      headers: buildHeaders(request.headers, body.length),
      body
    });

    const contentType = upstream.headers.get("content-type") || "application/json";
    const payload = await upstream.arrayBuffer();

    response.statusCode = upstream.status;
    response.setHeader("Content-Type", contentType);
    return response.send(Buffer.from(payload));
  } catch (error) {
    return response.status(500).json({
      message: error?.message || "UZBEKVOICE_PROXY_FAILED"
    });
  }
}
