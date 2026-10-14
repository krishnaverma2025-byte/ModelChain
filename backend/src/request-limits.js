import { rateLimit } from 'express-rate-limit';

export const REQUEST_LIMITS = {challenge:30, sessionCreate:30, sessionRead:120, sessionDelete:30, upload:10, cleanup:10, download:40, metadata:240};
export function requestLimiter(category) {
  return rateLimit({
    windowMs:60000, limit:REQUEST_LIMITS[category], standardHeaders:'draft-8', legacyHeaders:false,
    // Use the socket IP, NOT attacker-controlled forwarding headers. Render users
    // may share this conservative quota until its exact proxy topology is verified.
    validate:{xForwardedForHeader:false, forwardedHeader:false},
    handler:(_req,res)=>res.status(429).json({error:'Too many requests. Wait a moment before trying again.'}),
  });
}
