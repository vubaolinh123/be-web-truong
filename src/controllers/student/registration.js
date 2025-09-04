import StudentRegistration from '../../models/StudentRegistration.js';
import logger from '../../config/logger.js';
import { getCurrentVietnamTime } from '../../utils/timezone.js';
import fetch from 'node-fetch';

// Basic sanitization helper
const sanitize = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidVNPhone = (phone) => /^(?:\+84|0)(?:\d){9,10}$/.test(phone);

// reCAPTCHA helpers
const RECAPTCHA_ENABLED = (process.env.RECAPTCHA_ENABLED || 'false').toLowerCase() === 'true';
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';

async function verifyRecaptcha(token, ip) {
  if (!RECAPTCHA_ENABLED) return { ok: true };
  if (!token) return { ok: false, message: 'Thiếu mã xác thực reCAPTCHA' };
  if (!RECAPTCHA_SECRET) return { ok: false, message: 'Cấu hình reCAPTCHA chưa được thiết lập' };

  try {
    const params = new URLSearchParams();
    params.append('secret', RECAPTCHA_SECRET);
    params.append('response', token);
    if (ip) params.append('remoteip', ip);

    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const result = await resp.json();
    if (result.success) return { ok: true };
    return { ok: false, message: 'Xác thực reCAPTCHA thất bại. Vui lòng thử lại.' };
  } catch (e) {
    logger.warn('⚠️ Lỗi xác thực reCAPTCHA', { error: e.message, ip });
    return { ok: false, message: 'Không thể xác thực reCAPTCHA vào lúc này.' };
  }
}

export const registerStudent = async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  try {
    const { name, email, facebook, phone, major, recaptchaToken } = req.body || {};

    const data = {
      name: sanitize(name),
      email: sanitize(email).toLowerCase(),
      facebook: sanitize(facebook || ''),
      phone: sanitize(phone),
      major: sanitize(major),
    };

    // Validation
    const errors = {};
    if (!data.name) errors.name = 'Họ và tên là bắt buộc';
    if (!data.email) errors.email = 'Email là bắt buộc';
    else if (!isValidEmail(data.email)) errors.email = 'Email không hợp lệ';

    if (data.facebook && !/^https?:\/\//i.test(data.facebook)) {
      errors.facebook = 'Liên kết Facebook không hợp lệ';
    }

    if (!data.phone) errors.phone = 'Số điện thoại là bắt buộc';
    else if (!isValidVNPhone(data.phone)) errors.phone = 'Số điện thoại Việt Nam không hợp lệ';

    if (!data.major) errors.major = 'Ngành đăng ký là bắt buộc';

    if (Object.keys(errors).length > 0) {
      logger.warn('❗ Dữ liệu đăng ký không hợp lệ', { ip, errors, path: req.originalUrl });
      return res.status(400).json({ status: 'error', message: 'Dữ liệu không hợp lệ', data: { errors } });
    }

    // reCAPTCHA verification (optional)
    const recaptchaCheck = await verifyRecaptcha(recaptchaToken, ip);
    if (!recaptchaCheck.ok) {
      logger.warn('🔒 reCAPTCHA không hợp lệ', { ip, path: req.originalUrl });
      return res.status(400).json({ status: 'error', message: recaptchaCheck.message, data: { errors: { recaptcha: recaptchaCheck.message } } });
    }

    // Persist
    const doc = await StudentRegistration.create({
      ...data,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || ''
    });

    logger.success('✅ Đăng ký sinh viên thành công', { ip, id: doc._id, email: doc.email, time: getCurrentVietnamTime() });

    return res.status(201).json({
      status: 'success',
      message: 'Đăng ký thành công. Chúng tôi sẽ liên hệ sớm!',
      data: { id: doc._id }
    });
  } catch (error) {
    logger.apiError('❌ Lỗi khi xử lý đăng ký sinh viên', { ip, error: error.message, stack: error.stack });
    return res.status(500).json({ status: 'error', message: 'Có lỗi xảy ra. Vui lòng thử lại sau.', data: null });
  }
};

