import {
  ChromaClient,
  Collection,
  IncludeEnum,
  OpenAIEmbeddingFunction,
} from "chromadb";
import z from "zod";
import { metadataList } from "../server";

export const Embedding = z.array(z.number());
export const client = new ChromaClient();

const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY!,
});

export let collection: Collection;
try {
  console.log("creating collection");
  collection = await client.createCollection({
    name: process.env.BRAIN_NAME!,
    embeddingFunction: embedder,
    metadata: { "hnsw:space": "cosine" },
  });
} catch (error) {
  console.log(error);
  collection = await client.getCollection({
    name: process.env.BRAIN_NAME!,
    embeddingFunction: embedder,
  });
}

export const embed = async (
  text: string[],
  ids: string[],
  metadata: any[],
  embeddings?: number[][]
) =>
  await collection.add({
    ids: ids,
    metadatas: metadata,
    embeddings: embeddings,
    documents: text,
  });

export const query = async (text: string, nResults: number = 5) =>
  await collection.query({
    nResults,
    queryTexts: [text],
  });

export const findSimilar = async (
  embeddings: number[][],
  nResults: number = 5,
  where: any = undefined // TODO where needs to be "Where"
) => {
  const queryResults = await collection.query({
    queryEmbeddings: embeddings,
    nResults,
    where,
    include: [IncludeEnum.Metadatas, IncludeEnum.Distances],
  });
  // console.log(queryResults);

  let similarSimple = [];
  for (let i = 0; i < queryResults.metadatas[0].length; i++) {
    const meta = metadataList.find(
      (m) => m.hash === queryResults.metadatas[0][i].hash
    );
    similarSimple.push({
      hash: queryResults.metadatas[0][i].hash as string,
      distance: queryResults.distances[0][i],
      text: meta.audio.transcript,
      summary: meta.summary,
      title: meta.title,
    });
  }
  similarSimple = similarSimple.sort((a, b) => a.distance - b.distance);
  let unique = new Map<
    string,
    { hash: string; distance: number; summary: string; title: string }
  >();

  similarSimple.forEach((item) => {
    unique.set(item.hash, item);
  });
  const results = Array.from(unique.values()).sort(
    (a, b) => a.distance - b.distance
  );

  return results;
};
