export default function handler(_request: any, response: any) {
  response.status(200).json({
    ok: true,
    service: "cloakpay-ai",
    network: "devnet",
    mainnetEnabled: false,
    paidServices: false,
    checkedAt: new Date().toISOString()
  });
}
