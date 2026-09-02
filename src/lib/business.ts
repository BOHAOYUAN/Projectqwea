export const BUSINESS_CONFIG = {
  id: 'ms_beauty_baltimore',
  name: 'MS BEAUTY',
  location: 'Baltimore, MD',
  address: '1006 Eastern Ave, Baltimore, MD 21202',
  industry: ['美容', '头疗'],
  services: ['面部 SPA', '头疗 SPA', '背部 SPA'],
  googleMapsUrl:
    'https://www.google.com/maps/place/MS+BEAUTY/@39.2853978,-76.600104,17z/data=!3m1!4b1!4m6!3m5!1s0x89c8035d1afafeff:0x47a57effa39720a7!8m2!3d39.2853978!4d-76.600104!16s%2Fg%2F11x6njxmfg!18m1!1e1?entry=ttu',
  website: 'https://msbeautymd.com/',
  phone: '+1 443-438-5887',
  openingHours: 'Monday–Sunday, 10:00 AM–8:00 PM',
  summary:
    'A Baltimore beauty and wellness spa offering professional skincare, scalp therapy, massage, and personalized relaxation services.',
} as const;

export const BUSINESS_SERVICES_TEXT = BUSINESS_CONFIG.services.join('、');
