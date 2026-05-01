export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "METHOD_NOT_ALLOWED" });
  }

  try {
    const upstream = await fetch("https://uzbekvoice.ai/api/v1/tts", {
      method: "POST",
      headers: {
        Authorization: request.headers.authorization || "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request.body || {})
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return response.status(upstream.status).send(errorText);
    }

    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      const audioUrl = data.audio_url || data.result?.url || data.result?.audio_url || data.url;

      if (audioUrl) {
        const audioResponse = await fetch(audioUrl);
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        response.setHeader("Content-Type", audioResponse.headers.get("content-type") || "audio/wav");
        return response.status(200).send(audioBuffer);
      }

      return response.status(200).json(data);
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    response.setHeader("Content-Type", contentType || "audio/mpeg");
    return response.status(upstream.status).send(buffer);
  } catch (error) {
    return response.status(500).json({
      message: error?.message || "UZBEKVOICE_PROXY_FAILED"
    });
  }
}
