// middleware/auth.js
// Vérifie le JWT Keycloak et extrait les rôles depuis realm_access.roles
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8180';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'sgfv';

const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

/**
 * Middleware : vérifie le JWT et attache user + roles à req
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('JWT invalide:', err.message);
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
    req.user = decoded;
    req.userRoles = decoded?.realm_access?.roles || [];
    next();
  });
}

/**
 * Middleware factory : autorise seulement les rôles spécifiés
 * Exemple : authorize('admin', 'technicien')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    const hasRole = allowedRoles.some(role => req.userRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        error: 'Accès refusé',
        message: `Rôles requis: ${allowedRoles.join(', ')}. Votre rôle: ${req.userRoles.join(', ') || 'aucun'}`
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
