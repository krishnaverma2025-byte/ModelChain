import { formatEther } from "ethers";
import { metadata, readContract } from "./blockchain";
import { createReadPool } from './read-pool.mjs';
const catalogReads = createReadPool();

export const categories = [
  "Generative AI",
  "Computer Vision",
  "Natural Language",
  "Predictive AI",
];

export function loadCatalog({signal} = {}) {
  return catalogReads('catalog',async signal=>{
  const contract = await readContract();
  const count = await contract.getModelCount();
  const models = [];
  for (let id = 1n; id <= count; id++) {
    signal.throwIfAborted();
    const model = await contract.getModel(id);
    const extra = await metadata(id,{signal});
    // Supporting off-chain metadata never overrides authoritative contract fields.
    models.push({
      ...extra,
      id: String(model.id),
      name: model.name,
      owner: model.owner,
      active: model.active,
      price: formatEther(model.price),
      modelHash: model.modelHash,
      cid: model.cid,
    });
  }
  return models;
  },signal);
}
