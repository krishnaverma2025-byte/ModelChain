import { formatEther } from "ethers";
import { metadata, readContract } from "./blockchain";

export const categories = [
  "Generative AI",
  "Computer Vision",
  "Natural Language",
  "Predictive AI",
];

export async function loadCatalog() {
  const contract = await readContract();
  const count = await contract.getModelCount();
  const models = [];
  for (let id = 1n; id <= count; id++) {
    const model = await contract.getModel(id);
    const extra = await metadata(id);
    // Supporting off-chain metadata never overrides authoritative contract fields.
    models.push({
      ...extra,
      id: String(model.id),
      name: model.name,
      owner: model.owner,
      active: model.active,
      price: formatEther(model.price),
    });
  }
  return models;
}
