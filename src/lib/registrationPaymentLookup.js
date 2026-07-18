/** Pure helpers for applying Calendly payment-lookup results onto a registration. */

export const deriveRegistrationPaymentStatus = (amount, successful) => {
  if (successful === true) return "paid";
  if (amount === 0) return "paid";
  if (amount != null && amount !== "" && !Number.isNaN(Number(amount)) && successful === false) return "unpaid";
  return "unknown";
};

export const applyRegistrationPaymentLookup = (reg, pay) => {
  if (!pay || pay.paymentAmount == null) return reg;
  const paymentAmount = pay.paymentAmount;
  const paidAmount = pay.paidAmount != null ? pay.paidAmount : reg.paidAmount;
  let paymentStatus = reg.paymentStatus;
  if (reg.stripeVerified) {
    paymentStatus = reg.paymentStatus;
  } else if (paymentAmount === 0) {
    paymentStatus = "paid";
  } else if (paymentAmount > 0) {
    paymentStatus = reg.paymentStatus === "pending_verification" ? reg.paymentStatus : "unknown";
  } else {
    paymentStatus = deriveRegistrationPaymentStatus(
      paidAmount != null ? paidAmount : paymentAmount,
      pay.paymentSuccessful,
    );
  }
  return { ...reg, paymentAmount, paidAmount, paymentStatus };
};
