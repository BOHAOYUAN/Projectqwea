'use client';

import Link from 'next/link';
import { useCallback, useState, type ElementType, type ReactNode } from 'react';
import {
  ArrowLeft,
  Bot,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Copy,
  ExternalLink,
  Eye,
  Globe2,
  LayoutDashboard,
  Link2,
  MapPin,
  MessageCircle,
  Plus,
  Save,
  Sparkles,
  Star,
  Store,
  Tags,
  Users,
  WandSparkles,
} from 'lucide-react';

type Panel = 'overview' | 'brand' | 'services' | 'links' | 'studio' | 'reviews';
type Platform = 'google' | 'xiaohongshu';

type Service = {
  id: string;
  name: string;
  englishName: string;
  description: string;
  active: boolean;
};

type PlatformConfig = {
  enabled: boolean;
  url: string;
  hint: string;
};

type Location = {
  id: string;
  name: string;
  slug: string;
  address: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  hours: string;
  published: boolean;
  services: Service[];
  tags: string[];
  platforms: Record<Platform, PlatformConfig>;
  metrics: {
    rating: number;
    reviews: number;
    generated: number;
    responseRate: number;
  };
};

type Merchant = {
  id: string;
  name: string;
  slug: string;
  initials: string;
  industry: string;
  description: string;
  voice: string;
  locations: Location[];
};

type Review = {
  id: string;
  guest: string;
  platform: 'Google' | '小红书';
  rating: number;
  date: string;
  text: string;
  tags: string[];
};

type RemoteMembership = {
  merchantId: string;
  merchantSlug: string;
  merchantName: string;
  role: string;
};

type RemoteLocation = {
  id: string;
  slug: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  openingHours: string | null;
  isActive: boolean;
  services: Array<{
    id: string;
    nameEn: string;
    nameZh: string;
    description: string | null;
    isActive: boolean;
  }>;
  platformLinks: Array<{
    platform: string;
    destinationUrl: string | null;
    fallbackUrl: string | null;
    publishHint: string | null;
    isEnabled: boolean;
  }>;
  publicPage: { isPublished: boolean } | null;
  contentPreference: { suggestedTags: string[]; googleTone: string | null; xiaohongshuTone: string | null } | null;
  _count: { generationMetrics: number; reviews: number; replyDrafts: number };
};

type RemoteMerchant = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  industryTags: string[];
  locations: RemoteLocation[];
  generationSummary: Array<{ platform: string; provider: string; count: number }>;
  reviews: Array<{
    id: string;
    locationId: string;
    platform: string;
    source: string;
    reviewerAlias: string | null;
    rating: number | null;
    reviewText: string;
    reviewedAt: string | null;
  }>;
  replyDrafts: Array<{ locationId: string }>;
};

type RemoteWorkspace = {
  merchants: RemoteMembership[];
  activeMerchant: RemoteMerchant | null;
};

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RV';
}

function isPlaceholderAddress(value: string): boolean {
  return !value.trim() || /^add your public business address$/i.test(value.trim());
}

function industryTagsFrom(value: string): string[] {
  return value
    .split(/[·、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function mapRemoteWorkspace(remote: RemoteMerchant): { merchant: Merchant; reviews: Record<string, Review[]> } {
  const reviewsByLocation = remote.locations.reduce<Record<string, Review[]>>((result, location) => {
    const rows = remote.reviews.filter((review) => review.locationId === location.id);
    result[location.id] = rows.map((review) => ({
      id: review.id,
      guest: review.reviewerAlias || 'Anonymous',
      platform: review.platform === 'xiaohongshu' ? '小红书' : 'Google',
      rating: review.rating || 0,
      date: review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString('en-US') : 'Manual entry',
      text: review.reviewText,
      tags: [review.source === 'demo' ? '演示数据' : '手工录入'],
    }));
    return result;
  }, {});

  return {
    merchant: {
      id: remote.id,
      name: remote.name,
      slug: remote.slug,
      initials: initialsFor(remote.name),
      industry: remote.industryTags.join(' · ') || 'Merchant workspace',
      description: remote.description || 'Add a brand description for the content workspace.',
      voice: remote.locations[0]?.contentPreference?.googleTone || 'Warm, specific, and grounded in real guest details.',
      locations: remote.locations.map((location) => {
        const google = location.platformLinks.find((link) => link.platform === 'google');
        const xiaohongshu = location.platformLinks.find((link) => link.platform === 'xiaohongshu');
        const locationReviews = remote.reviews.filter((review) => review.locationId === location.id);
        const ratings = locationReviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === 'number');
        return {
          id: location.id,
          name: location.name,
          slug: location.slug,
          address: [
            location.addressLine1,
            location.addressLine2,
            [location.city, location.region, location.postalCode].filter(Boolean).join(', '),
          ].filter(Boolean).join(', '),
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2,
          city: location.city,
          region: location.region,
          postalCode: location.postalCode,
          hours: location.openingHours || 'Hours not set',
          published: Boolean(location.publicPage?.isPublished),
          services: location.services.map((service) => ({
            id: service.id,
            name: service.nameZh,
            englishName: service.nameEn,
            description: service.description || 'A customer-facing service selected for review context.',
            active: service.isActive,
          })),
          tags: location.contentPreference?.suggestedTags || [],
          platforms: {
            google: {
              enabled: Boolean(google?.isEnabled),
              url: google?.destinationUrl || google?.fallbackUrl || '',
              hint: google?.publishHint || 'Add the verified Google Maps review link before enabling.',
            },
            xiaohongshu: {
              enabled: Boolean(xiaohongshu?.isEnabled),
              url: xiaohongshu?.destinationUrl || xiaohongshu?.fallbackUrl || '',
              hint: xiaohongshu?.publishHint || 'Add a Xiaohongshu destination before enabling.',
            },
          },
          metrics: {
            rating: ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : 0,
            reviews: location._count.reviews,
            generated: location._count.generationMetrics,
            responseRate: location._count.reviews ? Math.round((location._count.replyDrafts / location._count.reviews) * 100) : 0,
          },
        };
      }),
    },
    reviews: reviewsByLocation,
  };
}

const GOOGLE_MS_BEAUTY =
  'https://www.google.com/maps/place/MS+BEAUTY/@39.2853978,-76.600104,17z/data=!3m1!4b1!4m6!3m5!1s0x89c8035d1afafeff:0x47a57effa39720a7!8m2!3d39.2853978!4d-76.600104!16s%2Fg%2F11x6njxmfg!18m1!1e1?entry=ttu';

const INITIAL_MERCHANTS: Merchant[] = [
  {
    id: 'ms-beauty',
    name: 'MS BEAUTY',
    slug: 'ms-beauty',
    initials: 'MS',
    industry: 'Beauty · Scalp Therapy',
    description:
      'A calm Baltimore studio for restorative facials, scalp care, and back treatments.',
    voice: 'Warm, calm, and specific — never salesy or over-polished.',
    locations: [
      {
        id: 'ms-baltimore',
        name: 'Baltimore · Eastern Ave',
        slug: 'baltimore',
        address: '1006 Eastern Ave, Baltimore, MD 21202',
        hours: 'Mon–Sun · 10:00 AM–8:00 PM',
        published: true,
        services: [
          {
            id: 'facial-spa',
            name: '面部 SPA',
            englishName: 'Facial Spa',
            description: 'A considered facial ritual focused on comfort and skin care.',
            active: true,
          },
          {
            id: 'scalp-spa',
            name: '头疗 SPA',
            englishName: 'Scalp Spa',
            description: 'A slow, relaxing scalp-care session tailored to each guest.',
            active: true,
          },
          {
            id: 'back-spa',
            name: '背部 SPA',
            englishName: 'Back Spa',
            description: 'A restorative back treatment with comfort check-ins throughout.',
            active: true,
          },
        ],
        tags: ['安静放松', '手法细致', '环境干净', '不催促', '头皮清爽', '贴心沟通'],
        platforms: {
          google: {
            enabled: true,
            url: GOOGLE_MS_BEAUTY,
            hint: 'Copy your review, then paste it into the Google review sheet.',
          },
          xiaohongshu: {
            enabled: true,
            url: '',
            hint: 'Copy the note first. A team-managed Xiaohongshu publishing link can be added here.',
          },
        },
        metrics: { rating: 4.9, reviews: 50, generated: 18, responseRate: 94 },
      },
    ],
  },
  {
    id: 'lumen-wellness',
    name: 'LUMEN WELLNESS',
    slug: 'lumen-wellness',
    initials: 'LW',
    industry: 'Wellness · Body Care',
    description: 'A demo merchant for testing a second brand, location, and content voice.',
    voice: 'Friendly, grounded, and lightly editorial.',
    locations: [
      {
        id: 'lumen-columbia',
        name: 'Columbia · Merriweather',
        slug: 'columbia-merriweather',
        address: '9000 Columbia Gateway Dr, Columbia, MD 21046',
        hours: 'Tue–Sun · 11:00 AM–7:00 PM',
        published: false,
        services: [
          {
            id: 'reset-facial',
            name: '焕亮面部护理',
            englishName: 'Reset Facial',
            description: 'A demo facial-care service for the second merchant.',
            active: true,
          },
          {
            id: 'neck-shoulder',
            name: '肩颈舒缓',
            englishName: 'Neck & Shoulder Reset',
            description: 'A demo recovery session for busy guests.',
            active: true,
          },
        ],
        tags: ['节奏舒服', '空间明亮', '很有耐心', '下班放松'],
        platforms: {
          google: {
            enabled: true,
            url: '',
            hint: 'Add the verified Google review URL before sharing this customer page.',
          },
          xiaohongshu: {
            enabled: false,
            url: '',
            hint: 'Enable after the team has created a Xiaohongshu destination.',
          },
        },
        metrics: { rating: 4.8, reviews: 12, generated: 6, responseRate: 83 },
      },
    ],
  },
];

const REVIEW_FEED: Record<string, Review[]> = {
  'ms-baltimore': [
    {
      id: 'emily',
      guest: 'Emily R.',
      platform: 'Google',
      rating: 5,
      date: 'Aug 28, 2026',
      text: 'The facial felt calm and unhurried. I appreciated how often they checked in about comfort.',
      tags: ['面部 SPA', '贴心沟通'],
    },
    {
      id: 'baltimore',
      guest: 'Baltimore生活家',
      platform: '小红书',
      rating: 5,
      date: 'Aug 27, 2026',
      text: '下班后来做头疗，过程很安静，结束后觉得整个人都松下来了。',
      tags: ['头疗 SPA', '安静放松'],
    },
    {
      id: 'michael',
      guest: 'Michael C.',
      platform: 'Google',
      rating: 5,
      date: 'Aug 26, 2026',
      text: 'The space was spotless and the back treatment did not feel rushed at all.',
      tags: ['背部 SPA', '环境干净'],
    },
  ],
  'lumen-columbia': [
    {
      id: 'jordan',
      guest: 'Jordan P.',
      platform: 'Google',
      rating: 5,
      date: 'Aug 25, 2026',
      text: 'A very welcoming first visit. The pace was just right after a long week.',
      tags: ['节奏舒服'],
    },
  ],
};

const NAVIGATION: Array<{ id: Panel; label: string; icon: ElementType }> = [
  { id: 'overview', label: '经营概览', icon: LayoutDashboard },
  { id: 'brand', label: '品牌与门店', icon: Building2 },
  { id: 'services', label: '服务商品', icon: Store },
  { id: 'links', label: '平台链接', icon: Link2 },
  { id: 'studio', label: '内容工作台', icon: WandSparkles },
  { id: 'reviews', label: '评价运营', icon: MessageCircle },
];

function SectionHeading(props: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#e7dfd1] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a47855]">{props.eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#372e28]">{props.title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#766c62]">{props.description}</p>
      </div>
      {props.action}
    </div>
  );
}

function Pill(props: { active: boolean; children: ReactNode }) {
  return (
    <span className={props.active ? 'inline-flex items-center gap-1.5 rounded-full bg-[#e7f0e8] px-2.5 py-1 text-[11px] font-semibold text-[#527158]' : 'inline-flex items-center gap-1.5 rounded-full bg-[#eee9e2] px-2.5 py-1 text-[11px] font-semibold text-[#85796d]'}>
      <span className={props.active ? 'h-1.5 w-1.5 rounded-full bg-[#698b6d]' : 'h-1.5 w-1.5 rounded-full bg-[#aa9d8f]'} />
      {props.children}
    </span>
  );
}

function Toggle(props: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      onClick={props.onChange}
      className={props.checked ? 'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#77604b] transition-colors' : 'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-[#d8cfc4] transition-colors'}
    >
      <span className={props.checked ? 'inline-block h-4 w-4 translate-x-6 rounded-full bg-white shadow-sm transition-transform' : 'inline-block h-4 w-4 translate-x-1 rounded-full bg-white shadow-sm transition-transform'} />
    </button>
  );
}

function Metric(props: {
  label: string;
  value: string;
  helper: string;
  icon: ElementType;
  color: string;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-3xl border border-[#e8dfd2] bg-white p-5 shadow-[0_12px_30px_rgba(79,61,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#81766a]">{props.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#342b25]">{props.value}</p>
        </div>
        <div className={'rounded-2xl p-2.5 ' + props.color}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-xs text-[#8c8176]">{props.helper}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [merchants, setMerchants] = useState<Merchant[]>(INITIAL_MERCHANTS);
  const [merchantId, setMerchantId] = useState('ms-beauty');
  const [locationId, setLocationId] = useState('ms-baltimore');
  const [panel, setPanel] = useState<Panel>('overview');
  const [newLocation, setNewLocation] = useState('');
  const [newService, setNewService] = useState('');
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newTag, setNewTag] = useState('');
  const [selectedTagsByLocation, setSelectedTagsByLocation] = useState<Record<string, string[]>>({});
  const [selectedServiceByLocation, setSelectedServiceByLocation] = useState<Record<string, string>>({});
  const [experienceByLocation, setExperienceByLocation] = useState<Record<string, string>>({});
  const [draftsByLocation, setDraftsByLocation] = useState<Record<string, Record<Platform, string>>>({});
  const [draftPlatform, setDraftPlatform] = useState<Platform>('google');
  const [replySourceByLocation, setReplySourceByLocation] = useState<Record<string, string>>({});
  const [replyPlatformByLocation, setReplyPlatformByLocation] = useState<Record<string, Platform>>({});
  const [replyByLocation, setReplyByLocation] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'local' | 'connected'>('local');
  const [remoteMemberships, setRemoteMemberships] = useState<RemoteMembership[]>([]);
  const [remoteReviewFeed, setRemoteReviewFeed] = useState<Record<string, Review[]>>({});
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [isWorkspaceSaving, setIsWorkspaceSaving] = useState(false);

  const loadConnectedWorkspace = useCallback(async (merchantSlug?: string, preferredLocationId?: string) => {
    setIsWorkspaceLoading(true);
    try {
      const query = merchantSlug ? '?merchant=' + encodeURIComponent(merchantSlug) : '';
      const response = await fetch('/api/dashboard/workspace' + query, { cache: 'no-store' });
      if (!response.ok) {
        const failure = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice(failure?.error || '暂时无法连接云端工作区，请先完成登录和数据库配置。');
        return;
      }
      const payload = (await response.json()) as RemoteWorkspace;
      if (!payload.activeMerchant || payload.activeMerchant.locations.length === 0) {
        setNotice('这个账号暂时没有可访问的商家或门店。');
        return;
      }

      const mapped = mapRemoteWorkspace(payload.activeMerchant);
      setMerchants([mapped.merchant]);
      setMerchantId(mapped.merchant.id);
      setLocationId(
        mapped.merchant.locations.find((item) => item.id === preferredLocationId)?.id ??
          mapped.merchant.locations[0].id
      );
      setRemoteMemberships(payload.merchants);
      setRemoteReviewFeed(mapped.reviews);
      setWorkspaceMode('connected');
    } catch {
      setNotice('暂时无法连接云端工作区，本地体验数据仍可继续使用。');
    } finally {
      setIsWorkspaceLoading(false);
    }
  }, []);

  const merchant = merchants.find((item) => item.id === merchantId) ?? merchants[0];
  const location = merchant.locations.find((item) => item.id === locationId) ?? merchant.locations[0];
  const activeServices = location.services.filter((item) => item.active);
  const selectedServiceId = selectedServiceByLocation[location.id] ?? activeServices[0]?.id ?? '';
  const selectedService = activeServices.find((item) => item.id === selectedServiceId) ?? activeServices[0];
  const selectedTags = selectedTagsByLocation[location.id] ?? [];
  const drafts = draftsByLocation[location.id] ?? { google: '', xiaohongshu: '' };
  const reviewFeed = workspaceMode === 'connected'
    ? remoteReviewFeed[location.id] ?? []
    : REVIEW_FEED[location.id] ?? [];
  const publicPath = '/r/' + merchant.slug + '/' + location.slug;
  const fullCustomerLink = typeof window === 'undefined' ? publicPath : window.location.origin + publicPath;
  const xiaohongshuFallback =
    'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(merchant.name);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  const copy = async (key: string, text: string) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => {
        setCopied((current) => (current === key ? null : current));
      }, 1800);
    } catch {
      announce('当前浏览器无法复制，请手动复制。');
    }
  };

  const saveConnectedWorkspace = async () => {
    if (workspaceMode !== 'connected') {
      announce('请先登录并连接云端工作区，再保存为跨设备数据。');
      return;
    }

    const requestWorkspace = async (method: 'POST' | 'PATCH', payload: Record<string, unknown>) => {
      const response = await fetch('/api/dashboard/workspace', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { error?: string; merchant?: { slug: string }; location?: { id: string } } | null;
      if (!response.ok) throw new Error(result?.error || '无法保存工作区设置。');
      return result;
    };

    setIsWorkspaceSaving(true);
    try {
      if (merchant.id.startsWith('merchant-')) {
        if (isPlaceholderAddress(location.address)) {
          throw new Error('请先填写首个门店的真实公开地址，再创建云端商家。');
        }
        const result = await requestWorkspace('POST', {
          kind: 'merchant',
          data: {
            name: merchant.name,
            slug: merchant.slug,
            description: merchant.description,
            industryTags: industryTagsFrom(merchant.industry),
            locationName: location.name,
            locationSlug: location.slug,
            addressLine1: location.address,
            openingHours: location.hours,
            isPublished: location.published,
          },
        });
        await loadConnectedWorkspace(result?.merchant?.slug || merchant.slug);
        announce('商家和首个门店已创建到云端。可继续配置服务与平台链接。');
        return;
      }

      if (location.id.startsWith('location-')) {
        if (isPlaceholderAddress(location.address)) {
          throw new Error('请先填写新门店的真实公开地址，再保存。');
        }
        const result = await requestWorkspace('POST', {
          kind: 'location',
          merchantSlug: merchant.slug,
          data: {
            name: location.name,
            slug: location.slug,
            addressLine1: location.address,
            openingHours: location.hours,
            isPublished: location.published,
          },
        });
        await loadConnectedWorkspace(merchant.slug, result?.location?.id);
        announce('新门店已创建到云端。');
        return;
      }

      await requestWorkspace('PATCH', {
        kind: 'merchant',
        merchantSlug: merchant.slug,
        data: {
          name: merchant.name,
          description: merchant.description,
          industryTags: industryTagsFrom(merchant.industry),
        },
      });
      await requestWorkspace('PATCH', {
        kind: 'location',
        merchantSlug: merchant.slug,
        locationId: location.id,
        data: {
          name: location.name,
          slug: location.slug,
          addressLine1: location.addressLine1 || location.address,
          addressLine2: location.addressLine2 ?? null,
          city: location.city ?? null,
          region: location.region ?? null,
          postalCode: location.postalCode ?? null,
          openingHours: location.hours,
          isActive: true,
        },
      });
      await requestWorkspace('PATCH', {
        kind: 'publicPage',
        merchantSlug: merchant.slug,
        locationId: location.id,
        data: { isPublished: location.published },
      });
      await requestWorkspace('PATCH', {
        kind: 'contentPreference',
        merchantSlug: merchant.slug,
        locationId: location.id,
        data: {
          suggestedTags: location.tags,
          googleTone: merchant.voice,
          xiaohongshuTone: merchant.voice,
        },
      });

      for (const [index, service] of location.services.entries()) {
        if (service.id.startsWith('service-')) {
          await requestWorkspace('POST', {
            kind: 'service',
            merchantSlug: merchant.slug,
            data: {
              locationId: location.id,
              nameEn: service.englishName || service.name,
              nameZh: service.name || service.englishName,
              description: service.description,
            },
          });
        } else {
          await requestWorkspace('PATCH', {
            kind: 'service',
            merchantSlug: merchant.slug,
            locationId: location.id,
            id: service.id,
            data: {
              nameEn: service.englishName || service.name,
              nameZh: service.name || service.englishName,
              description: service.description,
              displayOrder: index,
              isActive: service.active,
            },
          });
        }
      }

      for (const platform of ['google', 'xiaohongshu'] as Platform[]) {
        const config = location.platforms[platform];
        const fallback = platform === 'xiaohongshu' && config.url.startsWith('xhsdiscover:') ? config.url : null;
        const destination = fallback ? null : config.url || null;
        await requestWorkspace('PATCH', {
          kind: 'platform',
          merchantSlug: merchant.slug,
          locationId: location.id,
          data: {
            platform,
            destinationUrl: destination,
            fallbackUrl: fallback,
            isEnabled: Boolean(config.enabled && config.url),
            publishHint: config.hint,
          },
        });
      }

      await loadConnectedWorkspace(merchant.slug, location.id);
      const waitingForUrl = (['google', 'xiaohongshu'] as Platform[]).some(
        (platform) => location.platforms[platform].enabled && !location.platforms[platform].url
      );
      announce(waitingForUrl ? '云端设置已保存；缺少真实链接的平台已保持未启用。' : '云端设置已保存。');
    } catch (error) {
      announce(error instanceof Error ? error.message : '保存失败，请稍后重试。');
    } finally {
      setIsWorkspaceSaving(false);
    }
  };

  const changeMerchant = (nextId: string) => {
    if (workspaceMode === 'connected') {
      void loadConnectedWorkspace(nextId);
      return;
    }
    const next = merchants.find((item) => item.id === nextId);
    if (!next) return;
    setMerchantId(nextId);
    setLocationId(next.locations[0].id);
  };

  const updateMerchant = (updates: Partial<Merchant>) => {
    setMerchants((current) =>
      current.map((item) => (item.id === merchant.id ? { ...item, ...updates } : item))
    );
  };

  const updateLocation = (updates: Partial<Location>) => {
    setMerchants((current) =>
      current.map((item) => {
        if (item.id !== merchant.id) return item;
        return {
          ...item,
          locations: item.locations.map((item) =>
            item.id === location.id ? { ...item, ...updates } : item
          ),
        };
      })
    );
  };

  const createMerchant = () => {
    const stamp = Date.now();
    const nextLocationId = 'location-' + stamp;
    const next: Merchant = {
      id: 'merchant-' + stamp,
      name: 'New wellness brand',
      slug: 'new-wellness-brand-' + stamp,
      initials: 'NW',
      industry: 'Beauty · Wellness',
      description: 'Add a short description that helps the content assistant use the right context.',
      voice: 'Warm and considered.',
      locations: [
        {
          id: nextLocationId,
          name: 'First location',
          slug: 'first-location-' + stamp,
          address: 'Add your public business address',
          hours: 'Add business hours',
          published: false,
          services: [],
          tags: [],
          platforms: {
            google: { enabled: false, url: '', hint: 'Add a verified Google Maps review link.' },
            xiaohongshu: { enabled: false, url: '', hint: 'Add a Xiaohongshu publishing destination.' },
          },
          metrics: { rating: 0, reviews: 0, generated: 0, responseRate: 0 },
        },
      ],
    };
    setMerchants((current) => [...current, next]);
    setMerchantId(next.id);
    setLocationId(nextLocationId);
    setPanel('brand');
    announce(workspaceMode === 'connected' ? '已创建商家草稿。填写首店真实地址后，点击“保存到云端”即可创建。' : '已创建本地商家草稿。');
  };

  const addLocation = () => {
    const name = newLocation.trim();
    if (!name) {
      announce('先输入门店名称，再新增门店。');
      return;
    }
    const stamp = Date.now();
    const next: Location = {
      id: 'location-' + stamp,
      name,
      slug: 'location-' + stamp,
      address: 'Add your public business address',
      hours: 'Add business hours',
      published: false,
      services: [],
      tags: [],
      platforms: {
        google: { enabled: false, url: '', hint: 'Add a verified Google Maps review link.' },
        xiaohongshu: { enabled: false, url: '', hint: 'Add a Xiaohongshu publishing destination.' },
      },
      metrics: { rating: 0, reviews: 0, generated: 0, responseRate: 0 },
    };
    setMerchants((current) =>
      current.map((item) =>
        item.id === merchant.id ? { ...item, locations: [...item.locations, next] } : item
      )
    );
    setLocationId(next.id);
    setNewLocation('');
    announce(workspaceMode === 'connected' ? '新门店已加入草稿。填写真实地址后，点击“保存到云端”即可创建。' : '新门店已加入当前商家。');
  };

  const addService = () => {
    const name = newService.trim();
    if (!name) {
      announce('先输入服务名称，再加入目录。');
      return;
    }
    const service: Service = {
      id: 'service-' + Date.now(),
      name,
      englishName: name,
      description: newServiceDescription.trim() || 'Add a concise, guest-friendly service description.',
      active: true,
    };
    updateLocation({ services: [...location.services, service] });
    setNewService('');
    setNewServiceDescription('');
    announce('服务已加入本地目录。');
  };

  const updateService = (serviceId: string, updates: Partial<Service>) => {
    updateLocation({
      services: location.services.map((item) =>
        item.id === serviceId ? { ...item, ...updates } : item
      ),
    });
  };

  const updatePlatform = (platform: Platform, updates: Partial<PlatformConfig>) => {
    updateLocation({
      platforms: {
        ...location.platforms,
        [platform]: { ...location.platforms[platform], ...updates },
      },
    });
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (!tag || location.tags.includes(tag)) return;
    updateLocation({ tags: [...location.tags, tag] });
    setNewTag('');
  };

  const toggleTag = (tag: string) => {
    setSelectedTagsByLocation((current) => {
      const currentTags = current[location.id] ?? [];
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((item) => item !== tag)
        : [...currentTags, tag];
      return { ...current, [location.id]: nextTags };
    });
  };

  const generateDrafts = () => {
    if (!selectedService) {
      announce('请先在服务商品页启用至少一个服务。');
      return;
    }
    const note = experienceByLocation[location.id]?.trim();
    const tagText = selectedTags.length ? selectedTags.join('、') : '';
    const google =
      'I visited ' + merchant.name + ' for ' + selectedService.englishName + '.\n\n' +
      (note
        ? 'One detail from my visit: ' + note + (note.endsWith('.') ? '' : '.')
        : tagText
          ? 'The experience I chose to highlight is “' + tagText + '”.'
          : 'Please add one specific detail from your own visit before posting this review.') +
      '\n\nPlease edit this draft so every line reflects your own experience before posting.';
    const xiaohongshu =
      '标题：记录一次' + selectedService.name + '体验\n\n' +
      '这次在 ' + merchant.name + ' 体验了' + selectedService.name + '。\n\n' +
      (note
        ? '我自己的感受是：' + note + (/[。！？]$/.test(note) ? '' : '。')
        : tagText
          ? '想重点记录的关键词是：“' + tagText + '”。'
          : '发布前我会再补上一两句自己的真实感受。') +
      '\n\n#' +
      merchant.name.replace(/\s+/g, '') + ' #' +
      location.name.split('·')[0].trim() + ' #' +
      selectedService.name.replace(/\s+/g, '');
    setDraftsByLocation((current) => ({
      ...current,
      [location.id]: { google, xiaohongshu },
    }));
    announce('已生成本地体验模式草稿，请在发布前核对。');
  };

  const generateReply = async () => {
    const source = replySourceByLocation[location.id]?.trim();
    if (!source) {
      announce('粘贴一条评价后，即可生成回复草稿。');
      return;
    }
    const platform = replyPlatformByLocation[location.id] ?? (/[\u4e00-\u9fff]/.test(source) ? 'xiaohongshu' : 'google');

    if (workspaceMode === 'connected') {
      try {
        const response = await fetch('/api/review-replies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            merchantSlug: merchant.slug,
            locationId: location.id,
            reviewText: source,
            tone: merchant.voice,
            save: true,
          }),
        });
        const data = (await response.json().catch(() => null)) as { draft?: { content?: string }; error?: string } | null;
        const content = data?.draft?.content;
        if (!response.ok || !content) throw new Error(data?.error || '暂时无法生成回复草稿。');
        setReplyByLocation((current) => ({ ...current, [location.id]: content }));
        announce('已生成并保存到当前商家工作区，可继续编辑或复制。');
        return;
      } catch (error) {
        announce(error instanceof Error ? error.message : '暂时无法生成回复草稿。');
        return;
      }
    }

    const chinese = platform === 'xiaohongshu';
    const reply = chinese
      ? '谢谢你认真分享这次体验。我们很珍惜每一条反馈，也会继续把服务细节做好。'
      : 'Thank you for taking the time to share your feedback. We appreciate hearing about your experience and will keep your comments in mind.';
    setReplyByLocation((current) => ({ ...current, [location.id]: reply }));
    announce('已生成可编辑的本地回复草稿。');
  };

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#372e28]">
      {notice && (
        <div className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full border border-[#d9c3ac] bg-[#fffaf4] px-4 py-2 text-xs font-semibold text-[#654b36] shadow-lg">
          {notice}
        </div>
      )}

      <header className="border-b border-[#e5dccf] bg-[#fcfaf6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="返回顾客页面" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7ded3] bg-white text-[#6d6258] transition hover:border-[#c9b49d] hover:text-[#382e27] sm:inline-flex">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#3d332b] text-sm font-semibold tracking-wide text-[#fffaf2] shadow-[0_8px_18px_rgba(61,51,43,0.18)]">RV</div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a17654]">Review room</p>
              <p className="truncate text-sm font-semibold text-[#372e28]">多商家评价运营中台</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select aria-label="选择商家" value={workspaceMode === 'connected' ? merchant.slug : merchant.id} onChange={(event) => changeMerchant(event.target.value)} className="h-10 appearance-none rounded-xl border border-[#e3d9cc] bg-white py-0 pl-3 pr-8 text-xs font-semibold text-[#4e4339] outline-none focus:border-[#a47754]">
                {workspaceMode === 'connected'
                  ? remoteMemberships.map((item) => <option key={item.merchantId} value={item.merchantSlug}>{item.merchantName}</option>)
                  : merchants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8f8173]" />
            </div>
            <div className="relative">
              <select aria-label="选择门店" value={location.id} onChange={(event) => setLocationId(event.target.value)} className="h-10 max-w-[12rem] appearance-none rounded-xl border border-[#e3d9cc] bg-white py-0 pl-3 pr-8 text-xs font-semibold text-[#4e4339] outline-none focus:border-[#a47754]">
                {merchant.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8f8173]" />
            </div>
            <button type="button" onClick={() => void loadConnectedWorkspace(workspaceMode === 'connected' ? merchant.slug : undefined)} disabled={isWorkspaceLoading} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#dcc8b2] bg-[#fffaf4] px-3 text-xs font-semibold text-[#6a4f39] transition hover:bg-[#f9eee2] disabled:cursor-wait disabled:opacity-60">
              <Save className="h-3.5 w-3.5" /> {isWorkspaceLoading ? '同步中' : workspaceMode === 'connected' ? '刷新云端数据' : '连接云端工作区'}
            </button>
            {workspaceMode === 'connected' && (
              <button type="button" onClick={() => void saveConnectedWorkspace()} disabled={isWorkspaceSaving} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#9a6758] px-3 text-xs font-semibold text-white transition hover:bg-[#805547] disabled:cursor-wait disabled:opacity-60">
                <Save className="h-3.5 w-3.5" /> {isWorkspaceSaving ? '保存中' : '保存到云端'}
              </button>
            )}
            <button type="button" onClick={createMerchant} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#3d332b] px-3 text-xs font-semibold text-white transition hover:bg-[#55463b]">
              <Plus className="h-3.5 w-3.5" /> 新增商家
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="rounded-3xl border border-[#e7dfd3] bg-[#fffdfa] p-3 shadow-[0_16px_40px_rgba(69,52,34,0.045)] lg:sticky lg:top-6 lg:h-fit">
          <div className="mb-4 rounded-2xl bg-[#f5ede2] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xs font-semibold tracking-wide text-[#745840] shadow-sm">{merchant.initials}</div>
              <Pill active={location.published}>客户页{location.published ? '已发布' : '草稿'}</Pill>
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-[#40362e]">{merchant.name}</p>
            <p className="mt-1 truncate text-xs text-[#83776c]">{location.name}</p>
          </div>
          <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1" aria-label="后台导航">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.id} onClick={() => setPanel(item.id)} className={panel === item.id ? 'flex items-center gap-2.5 rounded-xl bg-[#3d332b] px-3 py-2.5 text-left text-xs font-semibold text-white shadow-[0_6px_14px_rgba(61,51,43,0.16)]' : 'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#72665c] transition hover:bg-[#f7f1e8] hover:text-[#3f352e]'}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-[#eee5da] px-2 pt-4">
            <div className="flex items-center gap-2 text-[11px] leading-5 text-[#8a7e71]">
              <Users className="h-3.5 w-3.5 shrink-0 text-[#a57855]" />
              {workspaceMode === 'connected'
                ? '已读取当前成员可访问的云端商家数据。'
                : '当前为本地体验数据；配置 Supabase 后，点击“连接云端工作区”读取成员权限与数据库数据。'}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-[28px] border border-[#e7dfd3] bg-[#fffdfa] p-5 shadow-[0_16px_40px_rgba(69,52,34,0.045)] sm:p-7">
          {panel === 'overview' && (
            <div className="space-y-7">
              <SectionHeading
                eyebrow="Merchant overview"
                title={merchant.name + ' · ' + location.name}
                description="围绕可分享的顾客评价页、平台入口和真实回复节奏，查看这个门店的当前运营状态。"
                action={
                  <button type="button" disabled={!location.published} onClick={() => copy('customer-link', fullCustomerLink)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dcc8b2] bg-[#fffaf4] px-3.5 py-2.5 text-xs font-semibold text-[#6a4f39] transition hover:bg-[#f9eee2] disabled:cursor-not-allowed disabled:opacity-45">
                    {copied === 'customer-link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === 'customer-link' ? '链接已复制' : '复制客户链接'}
                  </button>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="公开评分" value={location.metrics.rating ? location.metrics.rating.toFixed(1) + ' ★' : '—'} helper={String(location.metrics.reviews) + ' 条演示/手工评价'} icon={Star} color="bg-[#f6ead7] text-[#8a5b37]" />
                <Metric label="本周内容草稿" value={String(location.metrics.generated)} helper="Google 与小红书内容工作台" icon={Sparkles} color="bg-[#f4e3df] text-[#9a6259]" />
                <Metric label="回复覆盖率" value={String(location.metrics.responseRate) + '%'} helper="用于手工与导入评价的跟进" icon={MessageCircle} color="bg-[#e7eee5] text-[#5a765d]" />
                <Metric label="已启用服务" value={String(activeServices.length)} helper={'共 ' + String(location.services.length) + ' 个本地商品'} icon={Store} color="bg-[#e8e3dc] text-[#4a4138]" />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-3xl border border-[#ebe2d6] bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#423830]">顾客链接</p>
                      <p className="mt-1 text-xs text-[#8a7e72]">公开页仅展示已发布门店的安全品牌信息与平台入口。</p>
                    </div>
                    <Pill active={location.published}>{location.published ? '公开中' : '未发布'}</Pill>
                  </div>
                  <div className="mt-4 rounded-2xl border border-[#ece2d4] bg-[#fbf7f0] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3d332b] text-xs font-semibold text-white">{merchant.initials}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#3e342d]">{merchant.name}</p>
                        <p className="mt-1 text-xs leading-5 text-[#766b60]">{location.address}</p>
                        <p className="mt-2 truncate font-mono text-[11px] text-[#9a7a5f]">{publicPath}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {location.published ? (
                        <a href={publicPath} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#ded4c7] bg-white px-3 py-2.5 text-xs font-semibold text-[#5c5044] transition hover:bg-[#faf5ee]">
                          <Eye className="h-3.5 w-3.5" /> 预览页面
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#ded4c7] bg-[#fcf8f2] px-3 py-2.5 text-xs font-semibold text-[#9a8d80]">
                          <Eye className="h-3.5 w-3.5" /> 发布后预览
                        </span>
                      )}
                      <button type="button" disabled={!location.published} onClick={() => copy('customer-card', fullCustomerLink)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#3d332b] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#55463b] disabled:cursor-not-allowed disabled:opacity-45">
                        {copied === 'customer-card' ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                        {copied === 'customer-card' ? '已复制' : '复制分享'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-[#ebe2d6] bg-[#f8f2e9] p-5">
                  <p className="text-sm font-semibold text-[#423830]">发布准备度</p>
                  <p className="mt-1 text-xs leading-5 text-[#83776b]">设置真实平台链接后，才适合正式对外分享。</p>
                  <div className="mt-4 space-y-3">
                    {(['google', 'xiaohongshu'] as Platform[]).map((platform) => {
                      const config = location.platforms[platform];
                      const name = platform === 'google' ? 'Google Reviews' : '小红书笔记';
                      const ready = config.enabled && Boolean(config.url);
                      return (
                        <div key={platform} className="flex items-center justify-between rounded-2xl border border-[#e9dfd2] bg-white/80 px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={platform === 'google' ? 'flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f0fe] text-xs font-bold text-[#3866bf]' : 'flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0f2] text-xs font-bold text-[#d65367]'}>{platform === 'google' ? 'G' : '红'}</div>
                            <div>
                              <p className="text-xs font-semibold text-[#4c4138]">{name}</p>
                              <p className="mt-0.5 text-[11px] text-[#8e8174]">{config.url ? '链接已配置' : '等待真实链接'}</p>
                            </div>
                          </div>
                          <Pill active={ready}>{ready ? '就绪' : '待配置'}</Pill>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#ebe2d6] bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#423830]">近期评价运营</p>
                    <p className="mt-1 text-xs text-[#8a7e72]">保留手工/演示评价流；未接入 Google 或 Yelp 抓取。</p>
                  </div>
                  <button type="button" onClick={() => setPanel('reviews')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#8c6242] hover:text-[#543d2c]">
                    查看回复工作台 <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-4 divide-y divide-[#f0e8de]">
                  {reviewFeed.slice(0, 3).map((review) => (
                    <div key={review.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#4a3f35]">{review.guest}</span>
                        <span className={review.platform === 'Google' ? 'rounded-full bg-[#e9f0fe] px-2 py-0.5 text-[10px] font-semibold text-[#4a6fbc]' : 'rounded-full bg-[#fff0f2] px-2 py-0.5 text-[10px] font-semibold text-[#c55a69]'}>{review.platform}</span>
                        <span className="text-[11px] text-[#b07c36]">{'★'.repeat(review.rating)}</span>
                        <span className="ml-auto text-[11px] text-[#a1968b]">{review.date}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#6e6358]">{review.text}</p>
                    </div>
                  ))}
                  {!reviewFeed.length && <p className="py-6 text-center text-xs text-[#93877a]">这个门店还没有手工/演示评价。</p>}
                </div>
              </div>
            </div>
          )}

          {panel === 'brand' && (
            <div className="space-y-7">
              <SectionHeading
                eyebrow="Brand & locations"
                title="品牌与门店配置"
                description="这里的品牌字段会成为公开顾客页和内容工作台的基础上下文。"
                action={<button type="button" onClick={() => void saveConnectedWorkspace()} disabled={isWorkspaceSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#3d332b] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#55463b] disabled:cursor-wait disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {isWorkspaceSaving ? '保存中' : workspaceMode === 'connected' ? '保存到云端' : '连接后保存'}</button>}
              />
              <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
                <div className="rounded-3xl border border-[#ebe2d6] bg-white p-5 sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3d332b] text-sm font-semibold tracking-wide text-white">{merchant.initials}</div>
                    <div>
                      <p className="text-sm font-semibold text-[#43382f]">品牌信息</p>
                      <p className="mt-1 text-xs text-[#8c8175]">Logo 上传字段将在持久化层接入后使用；当前以品牌缩写预览。</p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[#65594e]">商家名称<input value={merchant.name} onChange={(event) => updateMerchant({ name: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e4dbcf] bg-[#fffdfa] px-3 text-sm font-medium text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                    <label className="text-xs font-semibold text-[#65594e]">行业类型<input value={merchant.industry} onChange={(event) => updateMerchant({ industry: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e4dbcf] bg-[#fffdfa] px-3 text-sm font-medium text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                    <label className="text-xs font-semibold text-[#65594e] sm:col-span-2">品牌简介<textarea value={merchant.description} onChange={(event) => updateMerchant({ description: event.target.value })} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-[#e4dbcf] bg-[#fffdfa] px-3 py-2.5 text-sm leading-5 text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                    <label className="text-xs font-semibold text-[#65594e] sm:col-span-2">内容语气<input value={merchant.voice} onChange={(event) => updateMerchant({ voice: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e4dbcf] bg-[#fffdfa] px-3 text-sm text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                  </div>
                </div>
                <div className="rounded-3xl border border-[#ebe2d6] bg-[#f8f2e9] p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#43382f]">门店设置</p>
                      <p className="mt-1 text-xs text-[#8c8175]">每个门店有独立地址、slug 与公开页状态。</p>
                    </div>
                    <MapPin className="h-5 w-5 text-[#a27450]" />
                  </div>
                  <div className="mt-5 grid gap-4">
                    <label className="text-xs font-semibold text-[#65594e]">门店名称<input value={location.name} onChange={(event) => updateLocation({ name: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e4dbcf] bg-white px-3 text-sm font-medium text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                    <label className="text-xs font-semibold text-[#65594e]">公开地址<input value={location.address} onChange={(event) => updateLocation({ address: event.target.value, addressLine1: event.target.value, addressLine2: null, city: null, region: null, postalCode: null })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e4dbcf] bg-white px-3 text-sm text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-xs font-semibold text-[#65594e]">营业时间<input value={location.hours} onChange={(event) => updateLocation({ hours: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e4dbcf] bg-white px-3 text-sm text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                      <label className="text-xs font-semibold text-[#65594e]">公开 slug<input value={location.slug} onChange={(event) => updateLocation({ slug: event.target.value.toLowerCase().replace(/\s+/g, '-') })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e4dbcf] bg-white px-3 font-mono text-xs text-[#3f352d] outline-none focus:border-[#aa7956]" /></label>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[#e7dccc] bg-white px-3.5 py-3">
                      <div>
                        <p className="text-xs font-semibold text-[#50443a]">发布客户评价页</p>
                        <p className="mt-0.5 text-[11px] text-[#8e8174]">关闭后公开路由不应展示门店内容。</p>
                      </div>
                      <Toggle checked={location.published} onChange={() => updateLocation({ published: !location.published })} label="发布客户评价页" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#ebe2d6] bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#43382f]">门店列表</p>
                    <p className="mt-1 text-xs text-[#8c8175]">切换门店不会混用服务、链接或内容草稿。</p>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <input value={newLocation} onChange={(event) => setNewLocation(event.target.value)} placeholder="新门店名称" className="h-10 min-w-0 flex-1 rounded-xl border border-[#e4dbcf] bg-[#fffdfa] px-3 text-xs outline-none focus:border-[#aa7956] sm:w-48" />
                    <button type="button" onClick={addLocation} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#f2e3d0] px-3 text-xs font-semibold text-[#714e35] transition hover:bg-[#ead5bd]"><Plus className="h-3.5 w-3.5" /> 新增门店</button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {merchant.locations.map((item) => (
                    <button key={item.id} type="button" onClick={() => setLocationId(item.id)} className={item.id === location.id ? 'rounded-2xl border border-[#b78762] bg-[#fcf4e9] p-4 text-left shadow-sm' : 'rounded-2xl border border-[#ece3d8] bg-[#fffdfa] p-4 text-left transition hover:border-[#d8c3ad]'}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#473c33]">{item.name}</p>
                          <p className="mt-1 text-xs leading-5 text-[#887b70]">{item.address}</p>
                        </div>
                        <Pill active={item.published}>{item.published ? '已发布' : '草稿'}</Pill>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {panel === 'services' && (
            <div className="space-y-7">
              <SectionHeading eyebrow="Service catalog" title="服务商品目录" description="服务会出现在顾客端的可多选体验项中，也是平台专属文案的唯一服务上下文来源。" action={<button type="button" onClick={() => void saveConnectedWorkspace()} disabled={isWorkspaceSaving} className="inline-flex items-center gap-2 rounded-xl border border-[#dcc8b2] bg-[#fffaf4] px-3.5 py-2.5 text-xs font-semibold text-[#6a4f39] transition hover:bg-[#f9eee2] disabled:cursor-wait disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {isWorkspaceSaving ? '保存中' : workspaceMode === 'connected' ? '保存目录' : '连接后保存'}</button>} />
              <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
                <div className="space-y-3">
                  {location.services.map((service) => (
                    <div key={service.id} className="rounded-3xl border border-[#ebe2d6] bg-white p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <input aria-label="服务中文名称" value={service.name} onChange={(event) => updateService(service.id, { name: event.target.value })} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[#443a31] outline-none" />
                            <Pill active={service.active}>{service.active ? '顾客端可选' : '已停用'}</Pill>
                          </div>
                          <input aria-label="服务英文名称" value={service.englishName} onChange={(event) => updateService(service.id, { englishName: event.target.value })} className="mt-2 w-full border-0 bg-transparent p-0 text-xs text-[#9b8979] outline-none" />
                          <textarea aria-label="服务说明" value={service.description} onChange={(event) => updateService(service.id, { description: event.target.value })} rows={2} className="mt-3 w-full resize-none rounded-xl border border-[#eee5da] bg-[#fcfaf6] px-3 py-2 text-xs leading-5 text-[#71655b] outline-none focus:border-[#c99e79]" />
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                          <Toggle checked={service.active} onChange={() => updateService(service.id, { active: !service.active })} label={'切换 ' + service.name + ' 状态'} />
                          <span className="text-[11px] text-[#998d81]">图片字段已预留</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!location.services.length && <div className="rounded-3xl border border-dashed border-[#ddd1c3] bg-[#fbf7f0] p-10 text-center text-sm text-[#918477]">还没有服务。先在右侧加入一个商品。</div>}
                </div>
                <div className="h-fit rounded-3xl border border-[#e8dccd] bg-[#f7eee2] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#946542] shadow-sm"><Plus className="h-4 w-4" /></div>
                  <p className="mt-4 text-sm font-semibold text-[#463a31]">添加服务商品</p>
                  <p className="mt-1 text-xs leading-5 text-[#86776b]">不需要填写价格；首版只将服务作为真实评价与文案的上下文。</p>
                  <div className="mt-5 space-y-3">
                    <input value={newService} onChange={(event) => setNewService(event.target.value)} placeholder="例如：面部 SPA" className="h-10 w-full rounded-xl border border-[#e4d7c8] bg-white px-3 text-xs outline-none focus:border-[#ae7d59]" />
                    <textarea value={newServiceDescription} onChange={(event) => setNewServiceDescription(event.target.value)} placeholder="一句顾客看得懂的服务说明" rows={3} className="w-full resize-none rounded-xl border border-[#e4d7c8] bg-white px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#ae7d59]" />
                    <button type="button" onClick={addService} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#3d332b] text-xs font-semibold text-white transition hover:bg-[#55463b]"><Plus className="h-3.5 w-3.5" /> 加入目录</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {panel === 'links' && (
            <div className="space-y-7">
              <SectionHeading eyebrow="Platform destinations" title="Google 与小红书链接" description="这里保存的是发布去向，而不是 API Key。未配置的链接会明确显示为待配置，绝不伪造。" action={<button type="button" onClick={() => void saveConnectedWorkspace()} disabled={isWorkspaceSaving} className="inline-flex items-center gap-2 rounded-xl border border-[#dcc8b2] bg-[#fffaf4] px-3.5 py-2.5 text-xs font-semibold text-[#6a4f39] transition hover:bg-[#f9eee2] disabled:cursor-wait disabled:opacity-60"><Save className="h-3.5 w-3.5" /> {isWorkspaceSaving ? '保存中' : workspaceMode === 'connected' ? '保存链接' : '连接后保存'}</button>} />
              <div className="grid gap-5 xl:grid-cols-2">
                {(['google', 'xiaohongshu'] as Platform[]).map((platform) => {
                  const config = location.platforms[platform];
                  const google = platform === 'google';
                  const name = google ? 'Google Reviews' : '小红书笔记';
                  const ready = config.enabled && Boolean(config.url);
                  return (
                    <div key={platform} className="rounded-3xl border border-[#ebe2d6] bg-white p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <div className={google ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f0fe] text-sm font-bold text-[#3968c5]' : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f2] text-sm font-bold text-[#d44f67]'}>{google ? 'G' : '红'}</div>
                          <div>
                            <p className="text-sm font-semibold text-[#443a31]">{name}</p>
                            <p className="mt-1 text-xs leading-5 text-[#887b70]">{google ? '英文评价页会复制草稿后打开此 Maps 链接。' : '中文笔记页会复制草稿后前往团队配置的发布链接。'}</p>
                          </div>
                        </div>
                        <Toggle checked={config.enabled} onChange={() => updatePlatform(platform, { enabled: !config.enabled })} label={'启用 ' + name} />
                      </div>
                      <div className="mt-5 space-y-4">
                        <label className="block text-xs font-semibold text-[#65594e]">
                          {google ? '已验证的 Google Maps 评价链接' : '团队维护的小红书发布/主页链接'}
                          <input value={config.url} onChange={(event) => updatePlatform(platform, { url: event.target.value })} placeholder={google ? 'https://www.google.com/maps/...' : '暂未配置，顾客端将使用搜索兜底'} className="mt-1.5 h-11 w-full rounded-xl border border-[#e4dbcf] bg-[#fffdfa] px-3 text-xs text-[#4a3f36] outline-none focus:border-[#aa7956]" />
                        </label>
                        <label className="block text-xs font-semibold text-[#65594e]">
                          发布提示
                          <textarea value={config.hint} onChange={(event) => updatePlatform(platform, { hint: event.target.value })} rows={2} className="mt-1.5 w-full resize-none rounded-xl border border-[#e4dbcf] bg-[#fffdfa] px-3 py-2.5 text-xs leading-5 text-[#4a3f36] outline-none focus:border-[#aa7956]" />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill active={ready}>{ready ? '已启用且已配置' : config.enabled ? '已启用，等待链接' : '暂未启用'}</Pill>
                          {!google && !config.url && <a href={xiaohongshuFallback} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#a05c69] hover:text-[#7f3d4b]">查看搜索兜底 <ExternalLink className="h-3 w-3" /></a>}
                          {config.url && <button type="button" onClick={() => copy(platform + '-url', config.url)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8c6242] hover:text-[#543d2c]">{copied === platform + '-url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied === platform + '-url' ? '已复制' : '复制链接'}</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-3xl border border-[#e4d6c7] bg-[#fbf5ec] p-5 text-sm leading-6 text-[#75685c]">
                <p className="font-semibold text-[#594839]">安全说明</p>
                <p className="mt-1 text-xs">此页不收集、不展示，也不把 Google 或 Groq API Key 写入浏览器。密钥只应在未来的服务端环境变量中配置。</p>
              </div>
            </div>
          )}

          {panel === 'studio' && (
            <div className="space-y-7">
              <SectionHeading eyebrow="Content studio" title="平台专属内容工作台" description="先写下真实感受，再选服务与体验标签。体验模式不依赖 Groq Key，也不会编造价格、疗效或到店细节。" />
              <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                <div className="rounded-3xl border border-[#ebe2d6] bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3e5d3] text-[#95643e]"><Bot className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-semibold text-[#453a31]">体验输入 Agent</p>
                      <p className="text-[11px] text-[#8b7e72]">只拿你填写的事实做组织与润色。</p>
                    </div>
                  </div>
                  <label className="mt-5 block text-xs font-semibold text-[#65594e]">
                    这次真实体验
                    <textarea value={experienceByLocation[location.id] ?? ''} onChange={(event) => setExperienceByLocation((current) => ({ ...current, [location.id]: event.target.value }))} rows={5} placeholder="例如：我比较在意安静、护理时会不会确认力度，结束后感觉如何……" className="mt-1.5 w-full resize-none rounded-2xl border border-[#e4dbcf] bg-[#fffdfa] px-3 py-3 text-sm leading-6 text-[#493e35] outline-none focus:border-[#aa7956]" />
                  </label>
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-[#65594e]">本次服务</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeServices.map((service) => (
                        <button key={service.id} type="button" onClick={() => setSelectedServiceByLocation((current) => ({ ...current, [location.id]: service.id }))} className={selectedServiceId === service.id ? 'rounded-xl border border-[#9d6a47] bg-[#f6e8d7] px-3 py-2 text-xs font-semibold text-[#6d482e]' : 'rounded-xl border border-[#e8dfd3] bg-white px-3 py-2 text-xs font-semibold text-[#74685d] transition hover:border-[#caa986]'}>
                          {service.name}
                        </button>
                      ))}
                      {!activeServices.length && <p className="text-xs text-[#9a8d81]">请先到服务商品页启用服务。</p>}
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#65594e]">体验标签（可多选）</p><span className="text-[11px] text-[#998b7d]">{String(selectedTags.length)} selected</span></div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {location.tags.map((tag) => (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)} className={selectedTags.includes(tag) ? 'rounded-full border border-[#a97653] bg-[#f5e5d2] px-3 py-1.5 text-xs font-medium text-[#70492f]' : 'rounded-full border border-[#e6ddd2] bg-[#fffdfa] px-3 py-1.5 text-xs font-medium text-[#786c61] transition hover:border-[#caa986]'}>
                          {selectedTags.includes(tag) && <Check className="mr-1 inline h-3 w-3" />}{tag}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} placeholder="添加标签" className="h-9 min-w-0 flex-1 rounded-xl border border-[#e5dace] bg-[#fffdfa] px-3 text-xs outline-none focus:border-[#aa7956]" />
                      <button type="button" onClick={addTag} className="inline-flex h-9 items-center gap-1 rounded-xl border border-[#dbc4ad] bg-white px-3 text-xs font-semibold text-[#735039]"><Tags className="h-3.5 w-3.5" /> 添加</button>
                    </div>
                  </div>
                  <button type="button" onClick={generateDrafts} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3d332b] text-xs font-semibold text-white transition hover:bg-[#55463b]"><Sparkles className="h-4 w-4" /> 生成两种平台草稿</button>
                </div>

                <div className="rounded-3xl border border-[#e5d9ca] bg-[#f9f3ea] p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#453a31]">平台预览</p>
                      <p className="mt-1 text-xs leading-5 text-[#887b70]">不同平台用不同语言、长度和节奏，但都保留人的表达。</p>
                    </div>
                    <div className="inline-flex rounded-xl border border-[#e5d8c9] bg-white p-1">
                      <button type="button" onClick={() => setDraftPlatform('google')} className={draftPlatform === 'google' ? 'rounded-lg bg-[#e8f0fe] px-3 py-1.5 text-xs font-semibold text-[#3868c4]' : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-[#88796c]'}>Google · EN</button>
                      <button type="button" onClick={() => setDraftPlatform('xiaohongshu')} className={draftPlatform === 'xiaohongshu' ? 'rounded-lg bg-[#fff0f2] px-3 py-1.5 text-xs font-semibold text-[#ce5367]' : 'rounded-lg px-3 py-1.5 text-xs font-semibold text-[#88796c]'}>小红书 · 中文</button>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-[#e8dfd4] bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3 border-b border-[#f0e8de] pb-3">
                      <div className="flex items-center gap-2">
                        <div className={draftPlatform === 'google' ? 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f0fe] text-[11px] font-bold text-[#3868c4]' : 'flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff0f2] text-[11px] font-bold text-[#ce5367]'}>{draftPlatform === 'google' ? 'G' : '红'}</div>
                        <span className="text-xs font-semibold text-[#594c40]">{draftPlatform === 'google' ? 'Google review draft' : '小红书笔记草稿'}</span>
                      </div>
                      <Pill active={Boolean(drafts[draftPlatform])}>{drafts[draftPlatform] ? '已生成' : '等待输入'}</Pill>
                    </div>
                    <textarea value={drafts[draftPlatform]} onChange={(event) => setDraftsByLocation((current) => ({ ...current, [location.id]: { ...drafts, [draftPlatform]: event.target.value } }))} rows={draftPlatform === 'google' ? 9 : 12} placeholder={draftPlatform === 'google' ? '填写体验并生成后，英文评价会出现在这里。' : '填写体验并生成后，中文笔记会出现在这里。'} className="mt-4 w-full resize-none border-0 bg-transparent p-0 text-sm leading-7 text-[#4e4339] outline-none placeholder:text-[#b2a69a]" />
                    <div className="mt-4 flex flex-col gap-2 border-t border-[#f0e8de] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] leading-5 text-[#97897c]">AI 可能出错，请以实际体验为准并在发布前核对。</p>
                      <button type="button" disabled={!drafts[draftPlatform]} onClick={() => copy('draft-' + draftPlatform, drafts[draftPlatform])} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#3d332b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#55463b] disabled:cursor-not-allowed disabled:opacity-40">
                        {copied === 'draft-' + draftPlatform ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied === 'draft-' + draftPlatform ? '已复制' : '复制草稿'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {panel === 'reviews' && (
            <div className="space-y-7">
              <SectionHeading eyebrow="Review operations" title="评价运营与人味回复" description="当前保留手工/演示评价，便于团队练习筛选、回复和话术审核；没有接入任何第三方评论抓取。" />
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-[#ebe2d6] bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#443a31]">手工/演示评价流</p><span className="text-xs text-[#918477]">{String(reviewFeed.length)} 条</span></div>
                  <div className="mt-4 space-y-3">
                    {reviewFeed.map((review) => (
                      <button key={review.id} type="button" onClick={() => { setReplySourceByLocation((current) => ({ ...current, [location.id]: review.text })); setReplyPlatformByLocation((current) => ({ ...current, [location.id]: review.platform === 'Google' ? 'google' : 'xiaohongshu' })); }} className="w-full rounded-2xl border border-[#eee5da] bg-[#fffdfa] p-4 text-left transition hover:border-[#d8c1aa] hover:bg-[#fdf8f1]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[#4c4036]">{review.guest}</span>
                          <span className={review.platform === 'Google' ? 'rounded-full bg-[#e9f0fe] px-2 py-0.5 text-[10px] font-semibold text-[#4a6fbc]' : 'rounded-full bg-[#fff0f2] px-2 py-0.5 text-[10px] font-semibold text-[#c55a69]'}>{review.platform}</span>
                          <span className="text-[11px] text-[#bd863a]">{'★'.repeat(review.rating)}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[#706459]">{review.text}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">{review.tags.map((tag) => <span key={tag} className="rounded-md bg-[#f4eee6] px-2 py-1 text-[10px] font-medium text-[#817367]">#{tag}</span>)}</div>
                      </button>
                    ))}
                    {!reviewFeed.length && <p className="rounded-2xl border border-dashed border-[#e0d5c9] py-10 text-center text-xs text-[#95887b]">尚无手工/演示评价。</p>}
                  </div>
                </div>
                <div className="rounded-3xl border border-[#e5d9ca] bg-[#f8f1e8] p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#946542] shadow-sm"><MessageCircle className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-semibold text-[#443a31]">回复草稿助手</p>
                      <p className="text-[11px] text-[#8b7e72]">先粘贴或点选一条评价，生成后仍可编辑。</p>
                    </div>
                  </div>
                  <label className="mt-5 block text-xs font-semibold text-[#65594e]">
                    顾客评价
                    <textarea value={replySourceByLocation[location.id] ?? ''} onChange={(event) => setReplySourceByLocation((current) => ({ ...current, [location.id]: event.target.value }))} rows={5} placeholder="粘贴顾客评价，或点击左侧的一条演示评价" className="mt-1.5 w-full resize-none rounded-2xl border border-[#e4dbcf] bg-white px-3 py-3 text-sm leading-6 text-[#493e35] outline-none focus:border-[#aa7956]" />
                  </label>
                  <button type="button" onClick={() => void generateReply()} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#3d332b] text-xs font-semibold text-white transition hover:bg-[#55463b]"><WandSparkles className="h-3.5 w-3.5" /> 生成回复草稿</button>
                  <div className="mt-4 rounded-2xl border border-[#e4d8ca] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#5b4d40]">建议回复</p>
                      <button type="button" disabled={!replyByLocation[location.id]} onClick={() => copy('reply-draft', replyByLocation[location.id] ?? '')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#895f42] disabled:opacity-40">
                        {copied === 'reply-draft' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied === 'reply-draft' ? '已复制' : '复制'}
                      </button>
                    </div>
                    <textarea value={replyByLocation[location.id] ?? ''} onChange={(event) => setReplyByLocation((current) => ({ ...current, [location.id]: event.target.value }))} rows={6} placeholder="生成的可编辑回复会显示在这里。" className="mt-3 w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-[#51453a] outline-none placeholder:text-[#b4a79a]" />
                    <p className="mt-3 border-t border-[#f0e8de] pt-3 text-[11px] leading-5 text-[#95887b]">建议只在确有真实服务记录时再发送，不要承诺未发生的补偿或效果。</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1440px] items-center justify-between px-4 pb-7 text-[11px] text-[#94887c] sm:px-6 lg:px-8">
        <span>Review Room · local operations experience</span>
        <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> {merchant.name}</span>
      </footer>
    </div>
  );
}
