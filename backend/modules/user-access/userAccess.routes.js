const express = require('express');
const router = express.Router();
const controller = require('./userAccess.controller');
const { verifyToken, authorizeRoles } = require('../../middleware/auth.middleware');

// All routes require authentication & Admin/SuperAdmin role
router.use(verifyToken);
router.use(authorizeRoles('ADMIN', 'SUPER_ADMIN'));

// 1. Stats
router.get('/stats', controller.getStats);

// 2. Users CRUD & Details
router.get('/users', controller.getUsers);
router.get('/users/:id', controller.getUserById);
router.put('/users/:id', controller.updateUser);
router.post('/users/invite', controller.inviteUser);

// 3. Pending Invitations
router.get('/invitations/pending', controller.getPendingInvitations);
router.post('/invitations/:id/resend', controller.resendInvitation);
router.delete('/invitations/:id', controller.cancelInvitation);

// 4. Roles & Permission Matrices
router.get('/roles', controller.getRoles);
router.post('/roles', controller.createRole);

// 5. Security & Live Sessions
router.get('/security/sessions', controller.getSessions);
router.post('/security/force-logout', controller.forceLogout);
router.post('/security/reset-link', controller.sendResetLink);
router.post('/security/unlock', controller.unlockUser);

// 6. Business Activity Audit Logs
router.get('/activity-logs', controller.getActivityLogs);

module.exports = router;
