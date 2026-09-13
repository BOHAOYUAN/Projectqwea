// Official scheme: https://pages.xiaohongshu.com/activity/deeplink (Capa / 发布).
export const XHS_APP_PUBLISH_URL = 'xhsdiscover://post';
export const XHS_WEB_PUBLISH_URL = 'https://creator.xiaohongshu.com/publish/publish?target=image';

export function xhsPublishDestination(userAgent: string): string {
  return /Android|iPhone|iPad|iPod/i.test(userAgent) ? XHS_APP_PUBLISH_URL : XHS_WEB_PUBLISH_URL;
}
