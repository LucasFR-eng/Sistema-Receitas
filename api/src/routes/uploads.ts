import type { FastifyInstance } from "fastify";
import { detectImageType, saveFile } from "../lib/storage.js";

// A Vercel não aceita requisições acima de 4,5 MB; o navegador reduz as fotos antes de enviar
export const MAX_IMAGE_MB = 4;

export async function uploadRoutes(app: FastifyInstance) {
  // Recebe uma imagem (campo "file") e devolve o endereço onde ela ficou salva
  app.post(
    "/uploads/images",
    { onRequest: [app.authenticate], config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const file = await request.file();
      if (!file) return reply.status(400).send({ message: "Nenhuma imagem enviada" });

      let data: Buffer;
      try {
        data = await file.toBuffer();
      } catch (error) {
        if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
          return reply.status(413).send({ message: `A imagem pode ter no máximo ${MAX_IMAGE_MB} MB` });
        }
        throw error;
      }

      if (data.length > MAX_IMAGE_MB * 1024 * 1024) {
        return reply.status(413).send({ message: `A imagem pode ter no máximo ${MAX_IMAGE_MB} MB` });
      }

      const extension = detectImageType(data);
      if (!extension) {
        return reply.status(415).send({ message: "Envie uma imagem JPG, PNG ou WEBP" });
      }

      const url = await saveFile(data, extension);
      return reply.status(201).send({ url });
    },
  );
}
