import { toOfferRequest } from '../../lib/adapters';
// form payload -> API body for POST /offers
export const adaptOfferRequestBody = (p, acceptTerms) =>
  toOfferRequest({ productId: p.productId, offeredPrice: p.price, quantity: p.qty, message: p.message, paymentTerms: p.terms, acceptTerms });
