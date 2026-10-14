import { config } from '../config.js';
import { queryOne } from '../db.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';

export const isAdmin = (user) => user?.role === 'admin';
export const isVerifiedStudent = (user) => user?.role === 'student' && user?.is_verified === true;
export const isContributor = (user) => isAdmin(user) || isVerifiedStudent(user);

export const initialStatus = (user) => (isAdmin(user) && config.rules.autoApproveAdmin ? 'approved' : 'pending');

export const canViewHostel = (user, hostel) =>
  hostel.status === 'approved' || isAdmin(user) || (user && hostel.submitted_by === user.user_id);

export async function loadHostel(id) {
  const hostel = await queryOne('SELECT hostel_id, college_id, status, submitted_by FROM hostels WHERE hostel_id = ?', [id]);
  if (!hostel) throw notFound('Hostel not found.');
  return hostel;
}

export async function loadCollege(id) {
  const college = await queryOne('SELECT college_id, name FROM colleges WHERE college_id = ?', [id]);
  if (!college) throw badRequest('college_id: The selected college does not exist.');
  return college;
}

// Admins: always. Verified students: approved hostels of their own college, or hostels they submitted.
export function assertCanContribute(user, hostel) {
  if (isAdmin(user)) return;
  if (!isVerifiedStudent(user)) throw forbidden('Only verified students can contribute. Verify your college email first.');
  if (config.rules.restrictToOwnCollege && user.college_id !== hostel.college_id) {
    throw forbidden('You can only contribute to hostels of your own college.');
  }
  if (hostel.status !== 'approved' && hostel.submitted_by !== user.user_id) throw forbidden('This hostel is not public yet.');
}
