export type ValidationResult<T> = { success: true; data: T } | { success: false; error: string };

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateRegistrationInput(body: unknown): ValidationResult<{
  name: string;
  email: string;
  phone: string;
  password: string;
}> {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Data tidak valid" };
  }
  const { name, email, phone, password } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length < 3) {
    return { success: false, error: "Nama minimal 3 karakter" };
  }
  if (typeof email !== "string" || !isEmail(email)) {
    return { success: false, error: "Email tidak valid" };
  }
  if (typeof phone !== "string" || phone.trim().length < 8) {
    return { success: false, error: "Nomor telepon tidak valid" };
  }
  if (typeof password !== "string" || password.length < 6) {
    return { success: false, error: "Password minimal 6 karakter" };
  }
  return {
    success: true,
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password
    }
  };
}

export function validateLoginInput(body: unknown): ValidationResult<{
  email: string;
  password: string;
}> {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Data tidak valid" };
  }
  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || !isEmail(email)) {
    return { success: false, error: "Email tidak valid" };
  }
  if (typeof password !== "string" || password.length === 0) {
    return { success: false, error: "Password wajib diisi" };
  }
  return {
    success: true,
    data: { email: email.trim().toLowerCase(), password }
  };
}

export function validateOtpInput(body: unknown): ValidationResult<{
  code: string;
}> {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Data tidak valid" };
  }
  const { code } = body as Record<string, unknown>;
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { success: false, error: "Kode OTP harus 6 digit" };
  }
  return { success: true, data: { code } };
}

export function validateProductPayload(body: unknown): ValidationResult<{
  name: string;
  price: number;
  description?: string;
  stock: number;
  image?: string;
}> {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Data produk tidak valid" };
  }
  const { name, price, description, stock, image } = body as Record<string, unknown>;
  if (typeof name !== "string" || name.trim().length === 0) {
    return { success: false, error: "Nama produk wajib diisi" };
  }
  if (typeof price !== "number" || Number.isNaN(price) || price <= 0) {
    return { success: false, error: "Harga produk tidak valid" };
  }
  const normalizedStock = typeof stock === "number" && !Number.isNaN(stock) ? Math.max(0, Math.floor(stock)) : 0;
  const payload = {
    name: name.trim(),
    price,
    description: typeof description === "string" ? description.trim() : undefined,
    stock: normalizedStock,
    image: typeof image === "string" ? image.trim() : undefined
  };
  return { success: true, data: payload };
}

export function validateStatusInput(body: unknown): ValidationResult<{
  status: "waiting_payment" | "paid" | "expired";
}> {
  if (!body || typeof body !== "object") {
    return { success: false, error: "Data status tidak valid" };
  }
  const { status } = body as Record<string, unknown>;
  if (status !== "waiting_payment" && status !== "paid" && status !== "expired") {
    return { success: false, error: "Status tidak dikenali" };
  }
  return { success: true, data: { status } };
}
