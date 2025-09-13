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

// GET /api/students/registrations
export const listRegistrations = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    const { q, status, from, to } = req.query;

    const filter = {};
    if (status && ['new', 'contacted', 'enrolled', 'rejected'].includes(String(status))) {
      filter.status = status;
    }
    if (q) {
      const keyword = String(q).trim();
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        // include the whole day
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [registrations, total] = await Promise.all([
      StudentRegistration.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StudentRegistration.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách đăng ký thành công',
      data: {
        registrations,
        total,
        page,
        limit,
      },
    });
  } catch (error) {
    logger.apiError('❌ Lỗi khi lấy danh sách đăng ký', { error: error.message, stack: error.stack });
    return res.status(500).json({ status: 'error', message: 'Không thể lấy danh sách đăng ký', data: null });
  }
};

// PATCH /api/students/registrations/:id/status
export const updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['new', 'contacted', 'enrolled', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Trạng thái không hợp lệ', data: null });
    }
    const doc = await StudentRegistration.findByIdAndUpdate(id, { status }, { new: true });
    if (!doc) return res.status(404).json({ status: 'error', message: 'Không tìm thấy đăng ký', data: null });

    return res.status(200).json({ status: 'success', message: 'Cập nhật trạng thái thành công', data: { registration: doc } });
  } catch (error) {
    logger.apiError('❌ Lỗi khi cập nhật trạng thái đăng ký', { error: error.message, stack: error.stack });
    return res.status(500).json({ status: 'error', message: 'Không thể cập nhật trạng thái đăng ký', data: null });
  }
};



