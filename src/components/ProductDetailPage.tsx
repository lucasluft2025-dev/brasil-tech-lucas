import { FormEvent, MouseEvent, TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  MessageCircle,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CHECKOUT_URL_SPEC_KEY,
  DEFAULT_QA,
  MarketplaceProduct,
  ProductQuestion,
  money,
} from '../data/marketplaceCatalog';
import { getProductCatalogReviews } from '../data/productReviews';
import { applyProductSeo } from '../lib/seo';
import {
  PersistedQuestion,
  PersistedReview,
  StoreSettings,
} from '../services/firestoreStore';

interface ProductDetailPageProps {
  product: MarketplaceProduct;
  allProducts: MarketplaceProduct[];
  favorites: Set<number>;
  failedImages: Set<number>;
  userCep: string;
  selectedShipping: 'express' | 'standard';
  currentUser: User | null;
  persistedReviews: PersistedReview[];
  userOwnReviews?: PersistedReview[];
  persistedQuestions: PersistedQuestion[];
  storeSettings: StoreSettings;
  onChangeShipping: (method: 'express' | 'standard') => void;
  onUpdateCep: (cep: string) => void;
  onBack: () => void;
  onSelectCategory: (cat: string) => void;
  onOpenProduct: (id: number) => void;
  onToggleFav: (id: number) => void;
  onAddCart: (id: number, qty: number, openDrawer?: boolean) => void;
  onBuyNow: (id: number, qty: number) => void;
  onImageError: (id: number) => void;
  onNotify: (msg: string) => void;
  onRequireLogin: () => void;
  onOpenSecurityPage?: () => void;
  onSubmitQuestion: (product: MarketplaceProduct, question: string) => Promise<void>;
  onSubmitReview: (
    product: MarketplaceProduct,
    payload: { author: string; rating: number; comment: string }
  ) => Promise<void>;
  renderProductCard: (p: MarketplaceProduct) => React.ReactNode;
}

export function ProductDetailPage({
  product,
  allProducts,
  favorites,
  failedImages,
  userCep,
  selectedShipping,
  currentUser,
  persistedReviews,
  userOwnReviews = [],
  persistedQuestions,
  storeSettings,
  onChangeShipping,
  onUpdateCep,
  onBack,
  onSelectCategory,
  onOpenProduct,
  onToggleFav,
  onAddCart,
  onBuyNow,
  onImageError,
  onNotify,
  onRequireLogin,
  onOpenSecurityPage,
  onSubmitQuestion,
  onSubmitReview,
  renderProductCard,
}: ProductDetailPageProps) {
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [zoomOpen, setZoomOpen] = useState<boolean>(false);
  const [lightboxZoomed, setLightboxZoomed] = useState<boolean>(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [hoverZoom, setHoverZoom] = useState<boolean>(false);
  const [hoverOrigin, setHoverOrigin] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [failedGalleryUrls, setFailedGalleryUrls] = useState<Set<string>>(() => new Set());
  const touchStartXRef = useRef<number | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [cepDraft, setCepDraft] = useState<string>(userCep);
  const [cepCalculated, setCepCalculated] = useState<boolean>(Boolean(userCep));
  const [questionInput, setQuestionInput] = useState<string>('');
  const [reviewName, setReviewName] = useState<string>(currentUser?.displayName || '');
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewStars, setReviewStars] = useState<number>(5);
  const [reviewFilterStar, setReviewFilterStar] = useState<number | 'all'>('all');
  const [visibleReviewsCount, setVisibleReviewsCount] = useState<number>(10);
  const [reviewSubmittedNotice, setReviewSubmittedNotice] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const productQuestions: ProductQuestion[] = [
    ...persistedQuestions
      .filter((q) => q.productId === product.id)
      .map((q, idx) => ({
        id: 100000 + idx,
        question: `${q.authorName}: ${q.question}`,
        answer: q.answered
          ? q.answer
          : 'Pergunta enviada para a equipe Brasil Tech. Responderemos em breve.',
        date: q.date,
      })),
    ...DEFAULT_QA,
  ];

  const modelBaseReviews = useMemo(() => getProductCatalogReviews(product), [product]);

  const approvedCustomerReviews = useMemo(
    () =>
      persistedReviews
        .filter((r) => r.productId === product.id && r.status === 'approved')
        .map((r) => ({
          id: r.id,
          author: r.author,
          city: r.city,
          product: r.product,
          rating: r.rating,
          date: r.date,
          comment: r.comment,
        })),
    [persistedReviews, product.id]
  );

  const myPendingReviews = useMemo(
    () =>
      userOwnReviews.filter(
        (r) => r.productId === product.id && r.status !== 'approved'
      ),
    [userOwnReviews, product.id]
  );

  const productReviews = useMemo(
    () => [...approvedCustomerReviews, ...modelBaseReviews],
    [approvedCustomerReviews, modelBaseReviews]
  );

  const filteredReviews = useMemo(
    () =>
      reviewFilterStar === 'all'
        ? productReviews
        : productReviews.filter((r) => r.rating === reviewFilterStar),
    [productReviews, reviewFilterStar]
  );

  const shownReviews = filteredReviews.slice(0, visibleReviewsCount);

  const reviewStats = useMemo(() => {
    const total = productReviews.length;
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = total > 0 ? (sum / total).toFixed(1).replace('.', ',') : product.rating;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    productReviews.forEach((r) => {
      const k = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[k] += 1;
    });
    const rows = [5, 4, 3, 2, 1].map((star) => ({
      star,
      label: `${star} ★`,
      count: counts[star],
      pct: total > 0 ? Math.round((counts[star] / total) * 100) : 0,
    }));
    return { total, avg, rows, counts };
  }, [productReviews, product.rating]);

  const rawGallery =
    product.images && product.images.length > 0 ? product.images : [product.image];
  const gallery = rawGallery.filter((url) => Boolean(url) && !failedGalleryUrls.has(url));
  const safeIdx = gallery.length > 0 ? Math.min(activePhotoIdx, gallery.length - 1) : 0;
  const activePhoto = gallery[safeIdx];
  const hasDiscount = product.old > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / product.old) * 100) : 0;
  const isFav = favorites.has(product.id);

  const relatedProducts = allProducts
    .filter((item) => item.id !== product.id && item.cat === product.cat)
    .concat(allProducts.filter((item) => item.id !== product.id && item.cat !== product.cat))
    .slice(0, 4);

  useEffect(() => {
    applyProductSeo({
      product,
      storeSettings,
      reviews: productReviews,
      questions: productQuestions,
    });
  }, [product, storeSettings, persistedReviews, persistedQuestions]);

  useEffect(() => {
    if (!zoomOpen) {
      setLightboxZoomed(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomOpen(false);
      } else if (e.key === 'ArrowLeft' && gallery.length > 1) {
        setActivePhotoIdx((prev) => (prev === 0 ? gallery.length - 1 : prev - 1));
      } else if (e.key === 'ArrowRight' && gallery.length > 1) {
        setActivePhotoIdx((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomOpen, gallery.length]);

  const goPrevPhoto = () => {
    if (gallery.length <= 1) return;
    setLightboxZoomed(false);
    setActivePhotoIdx((prev) => (prev === 0 ? gallery.length - 1 : prev - 1));
  };

  const goNextPhoto = () => {
    if (gallery.length <= 1) return;
    setLightboxZoomed(false);
    setActivePhotoIdx((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (lightboxZoomed) return;
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || lightboxZoomed) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const diff = touchStartXRef.current - endX;
    touchStartXRef.current = null;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goNextPhoto();
      else goPrevPhoto();
    }
  };

  const handleStageMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!hoverZoom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setHoverOrigin({ x, y });
  };

  const handleLightboxMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!lightboxZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const handleCalcCep = (e: FormEvent) => {
    e.preventDefault();
    const digits = cepDraft.replace(/\D/g, '');
    if (digits.length < 8) {
      onNotify('Digite um CEP válido com 8 números.');
      return;
    }
    const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
    setCepDraft(formatted);
    onUpdateCep(formatted);
    setCepCalculated(true);
    onNotify(`Frete calculado para o CEP ${formatted}!`);
  };

  const handleAskQuestion = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = questionInput.trim();
    if (!trimmed) return;
    if (!currentUser) {
      onNotify('Entre com sua conta Google para enviar sua pergunta.');
      onRequireLogin();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitQuestion(product, trimmed);
      setQuestionInput('');
      onNotify('Sua pergunta foi registrada e aparecerá no painel da loja!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) return;
    if (!currentUser) {
      onNotify('Entre com sua conta Google para enviar uma avaliação.');
      onRequireLogin();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitReview(product, {
        author: reviewName.trim(),
        rating: reviewStars,
        comment: reviewText.trim(),
      });
      setReviewText('');
      setReviewSubmittedNotice(true);
      onNotify('Avaliação enviada para moderação! Ela será publicada após aprovação.');
    } catch {
      onNotify('Não foi possível enviar a avaliação agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="pdp-wrap">
      <div className="pdp-top">
        <button type="button" className="pdp-back" onClick={onBack}>
          ← Voltar para a loja
        </button>
        <nav className="pdp-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>
            Início
          </button>
          <span>›</span>
          <button type="button" onClick={() => onSelectCategory(product.cat)}>
            {product.cat}
          </button>
          <span>›</span>
          <span>{product.name}</span>
        </nav>
      </div>

      <div className="pdp-card">
        {/* Galeria de fotos */}
        <div className="pdp-gallery">
          <div
            className={`pdp-main-img ${hoverZoom ? 'is-hover-zooming' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseMove={handleStageMouseMove}
            onMouseLeave={() => setHoverZoom(false)}
          >
            {activePhoto && !failedImages.has(product.id) ? (
              <img
                src={activePhoto}
                alt={`${product.name} - foto ${safeIdx + 1}`}
                referrerPolicy="no-referrer"
                className="pdp-stage-photo"
                style={
                  hoverZoom
                    ? {
                        transform: 'scale(1.85)',
                        transformOrigin: `${hoverOrigin.x}% ${hoverOrigin.y}%`,
                        cursor: 'zoom-out',
                      }
                    : { cursor: 'zoom-in' }
                }
                onClick={() => setZoomOpen(true)}
                onError={() => {
                  setFailedGalleryUrls((prev) => {
                    const next = new Set(prev);
                    next.add(activePhoto);
                    return next;
                  });
                  if (gallery.length <= 1) onImageError(product.id);
                }}
              />
            ) : (
              <span className="fallback">{product.emoji}</span>
            )}

            {hasDiscount && <span className="discount">-{discount}%</span>}

            <button
              type="button"
              className={`heart pdp-heart ${isFav ? 'on' : ''}`}
              aria-label="Favoritar"
              onClick={() => onToggleFav(product.id)}
            >
              <Heart size={16} fill={isFav ? 'currentColor' : 'none'} strokeWidth={2.2} />
            </button>

            <div className="pdp-stage-controls">
              <button
                type="button"
                className={`pdp-stage-pill pdp-lupa-btn ${hoverZoom ? 'active' : ''}`}
                onClick={() => setHoverZoom((z) => !z)}
                title="Ativar lupa na foto"
              >
                <ZoomIn size={14} />
                <span>{hoverZoom ? 'Desativar lupa' : 'Lupa'}</span>
              </button>
              <button
                type="button"
                className="pdp-stage-pill pdp-expand-btn"
                onClick={() => setZoomOpen(true)}
                aria-label="Ampliar foto em tela cheia"
              >
                <Maximize2 size={14} />
                <span>
                  Ampliar {gallery.length > 1 ? `(${safeIdx + 1}/${gallery.length})` : ''}
                </span>
              </button>
            </div>

            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  className="pdp-nav-btn prev"
                  aria-label="Foto anterior"
                  onClick={goPrevPhoto}
                >
                  <ChevronLeft size={19} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="pdp-nav-btn next"
                  aria-label="Próxima foto"
                  onClick={goNextPhoto}
                >
                  <ChevronRight size={19} strokeWidth={2.5} />
                </button>
                <div className="pdp-dots" aria-label="Indicadores de foto">
                  {gallery.map((photoUrl, idx) => (
                    <button
                      key={`dot-${photoUrl}-${idx}`}
                      type="button"
                      className={`pdp-dot ${safeIdx === idx ? 'active' : ''}`}
                      aria-label={`Ir para foto ${idx + 1}`}
                      onClick={() => setActivePhotoIdx(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="pdp-thumbs">
              {gallery.map((photoUrl, idx) => (
                <button
                  key={`${photoUrl}-${idx}`}
                  type="button"
                  className={`pdp-thumb ${safeIdx === idx ? 'active' : ''}`}
                  aria-label={`Ver foto ${idx + 1}`}
                  onClick={() => setActivePhotoIdx(idx)}
                >
                  <img
                    src={photoUrl}
                    alt={`${product.name} miniatura ${idx + 1}`}
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Termômetro de Reputação estilo Mercado Livre */}
          <div className="pdp-reputation-card">
            <div className="pdp-rep-top">
              <span className="pdp-rep-medal">🏆 MercadoLíder Verificado</span>
              <span className="pdp-rep-sales">+{product.sold} vendidos</span>
            </div>
            <div className="pdp-rep-bars" aria-hidden="true">
              <span className="b1" />
              <span className="b2" />
              <span className="b3" />
              <span className="b4" />
              <span className="b5 active" />
            </div>
            <div className="pdp-rep-metrics">
              <div>
                <b>99,4%</b>
                <small>Entregas no prazo</small>
              </div>
              <div>
                <b>Excelente</b>
                <small>Bom atendimento</small>
              </div>
              <div>
                <b>Garantia</b>
                <small>Compra Protegida</small>
              </div>
            </div>
          </div>
        </div>

        {/* Informações de Compra & Segurança */}
        <div className="pdp-info">
          <div className="pdp-meta">
            <span className="pdp-condition-badge">{product.condition}</span>
            <span className="pdp-cat-tag">{product.cat}</span>
            <span className="pdp-stock-pill">✓ Estoque disponível ({product.stock} un.)</span>
          </div>

          <h1 className="pdp-title">{product.name}</h1>

          <div className="pdp-rating">
            ★ {reviewStats.avg}{' '}
            <span>({reviewStats.total} opiniões verificadas • +{product.sold} vendas)</span>
          </div>

          <div className="pdp-price-box">
            {hasDiscount && <div className="price-old">De {money(product.old)}</div>}
            <div className="pdp-price-row">
              <span className="pdp-price">{money(product.price)}</span>
              {hasDiscount && <span className="pdp-discount-pill">{discount}% OFF</span>}
            </div>
            <div className="pdp-pix-line">
              <b>{money(product.price)}</b> à vista no{' '}
              <strong>PIX • Aprovação imediata</strong>
            </div>
          </div>

          <div className="pdp-actions">
            <div className="pdp-qty" aria-label="Quantidade">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="pdp-buy-now"
              onClick={() => onBuyNow(product.id, qty)}
            >
              Comprar agora
            </button>
            <button
              type="button"
              className="pdp-add-bag"
              onClick={() => onAddCart(product.id, qty, true)}
            >
              Adicionar à sacola
            </button>
          </div>

          <a
            className="pdp-wa-direct"
            href={`https://wa.me/${storeSettings.whatsappDigits}?text=${encodeURIComponent(
              [
                `Olá! Estou vendo este produto na *${storeSettings.storeName}* e quero finalizar pelo WhatsApp:`,
                ``,
                `• Produto: *${product.name}* (#${product.id})`,
                `• Quantidade: ${qty} un.`,
                `• Valor à vista no PIX: *${money(product.price * qty)}*`,
                userCep ? `• Meu CEP: ${userCep}` : '',
              ]
                .filter(Boolean)
                .join('\n')
            )}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={17} strokeWidth={2.2} />
            <span>Chamar no WhatsApp sobre este produto</span>
          </a>

          <div className="pdp-shipping-box">
            <b>🚚 Calcular frete e prazo de entrega</b>
            <form className="pdp-cep-form" onSubmit={handleCalcCep}>
              <input
                type="text"
                placeholder="Digite seu CEP (ex: 01001-000)"
                maxLength={9}
                value={cepDraft}
                onChange={(e) => setCepDraft(e.target.value)}
              />
              <button type="submit">Calcular</button>
            </form>
            {cepCalculated && (
              <div className="pdp-shipping-options">
                <label
                  className={`pdp-shipping-opt selectable ${selectedShipping === 'express' ? 'selected' : ''}`}
                >
                  <span>
                    <input
                      type="radio"
                      name="pdpShip"
                      checked={selectedShipping === 'express'}
                      onChange={() => onChangeShipping('express')}
                    />{' '}
                    ⚡ Entrega Expressa — <b>Receba no mesmo dia</b>
                  </span>
                  <strong>{money(storeSettings.expressShippingPrice)}</strong>
                </label>
                <label
                  className={`pdp-shipping-opt selectable ${selectedShipping === 'standard' ? 'selected' : ''}`}
                >
                  <span>
                    <input
                      type="radio"
                      name="pdpShip"
                      checked={selectedShipping === 'standard'}
                      onChange={() => onChangeShipping('standard')}
                    />{' '}
                    📦 Entrega Padrão — <b>Em até 2 dias úteis</b>
                  </span>
                  <strong>{money(storeSettings.standardShippingPrice)}</strong>
                </label>
              </div>
            )}
          </div>

          <div className="pdp-guarantees">
            <div>
              <span>🛡️</span>
              <span>
                <b>Compra Garantida</b> — receba o produto que espera ou devolvemos o seu dinheiro.
              </span>
            </div>
            <div>
              <span>🔄</span>
              <span>
                <b>Devolução grátis</b> — você tem até 7 dias após o recebimento sem custo.
              </span>
            </div>
            <div>
              <span>🏆</span>
              <span>
                <b>Garantia oficial</b> — {product.warranty} e suporte via WhatsApp.
              </span>
            </div>
            <div>
              <span>🔒</span>
              <span>
                <b>Pagamento protegido via PIX</b> — ambiente criptografado com aprovação imediata.
              </span>
            </div>
            {onOpenSecurityPage && (
              <div style={{ marginTop: 6 }}>
                <span>✅</span>
                <button
                  type="button"
                  className="pdp-security-link"
                  onClick={onOpenSecurityPage}
                >
                  Ver política de garantia &amp; reembolso em 7 dias →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Descrição e Especificações */}
      <div className="pdp-desc-card">
        <h2>Descrição e características do produto</h2>
        <p>{product.desc}</p>
        <div className="pdp-specs">
          <div className="pdp-spec">
            <small>Categoria</small>
            <b>{product.cat}</b>
          </div>
          <div className="pdp-spec">
            <small>Condição</small>
            <b>{product.condition}</b>
          </div>
          <div className="pdp-spec">
            <small>Garantia</small>
            <b>{product.warranty}</b>
          </div>
          {product.specs
            .filter((spec) => spec.label !== CHECKOUT_URL_SPEC_KEY)
            .map((spec) => (
              <div className="pdp-spec" key={spec.label}>
                <small>{spec.label}</small>
                <b>{spec.value}</b>
              </div>
            ))}
        </div>
      </div>

      {/* Perguntas e Respostas + Avaliações estilo Mercado Livre / Amazon */}
      <div className="pdp-extra-grid">
        <div className="pdp-desc-card" style={{ marginTop: 0 }}>
          <h2>Perguntas e respostas</h2>
          <p style={{ fontSize: 12, marginBottom: 12 }}>
            Ficou com alguma dúvida sobre este produto? Pergunte diretamente para a loja.
          </p>
          <form className="pdp-cep-form" onSubmit={handleAskQuestion} style={{ marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Escreva sua pergunta sobre garantia, envio ou detalhes..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
            />
            <button type="submit" disabled={submitting}>
              Perguntar
            </button>
          </form>
          <div className="pdp-qa-list">
            {productQuestions.map((q) => (
              <div className="pdp-qa-item" key={q.id}>
                <div className="pdp-q">💬 {q.question}</div>
                <div className="pdp-a">
                  ↳ {q.answer} <small>• {q.date}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pdp-desc-card" style={{ marginTop: 0 }}>
          <h2>Opiniões de quem já comprou</h2>
          <div className="pdp-reviews-summary">
            <div className="pdp-score-big">
              <strong>{reviewStats.avg}</strong>
              <span>★★★★★</span>
              <small>{reviewStats.total} avaliações</small>
            </div>
            <div className="pdp-bars-list">
              {reviewStats.rows.map((row) => (
                <div className="pdp-bar-row" key={row.label}>
                  <span>{row.label}</span>
                  <div className="pdp-bar-track">
                    <div className="pdp-bar-fill" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span>{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pdp-reviews-filter-bar" role="tablist" aria-label="Filtrar avaliações por estrelas">
            <button
              type="button"
              className={`pdp-rev-filter-btn ${reviewFilterStar === 'all' ? 'active' : ''}`}
              onClick={() => {
                setReviewFilterStar('all');
                setVisibleReviewsCount(10);
              }}
            >
              Todas ({reviewStats.total})
            </button>
            {[5, 4, 3].map((star) => (
              <button
                key={star}
                type="button"
                className={`pdp-rev-filter-btn ${reviewFilterStar === star ? 'active' : ''}`}
                onClick={() => {
                  setReviewFilterStar(star);
                  setVisibleReviewsCount(12);
                }}
              >
                {star} ★ ({reviewStats.counts[star] || 0})
              </button>
            ))}
          </div>

          {myPendingReviews.length > 0 && (
            <div className="pdp-pending-reviews-box">
              {myPendingReviews.map((rev) => (
                <div className="pdp-review-item is-own-pending" key={rev.docId}>
                  <div className="pdp-review-head">
                    <span className="pdp-review-stars">{'★'.repeat(rev.rating)}</span>
                    <b>{rev.author}</b>
                    <span
                      className={`pdp-rev-status-badge ${
                        rev.status === 'rejected' ? 'rejected' : 'pending'
                      }`}
                    >
                      {rev.status === 'rejected'
                        ? 'Não publicada pela moderação'
                        : 'Aguardando aprovação do administrador'}
                    </span>
                  </div>
                  <p>{rev.comment}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pdp-reviews-count-line">
            Mostrando <b>{shownReviews.length}</b> de <b>{filteredReviews.length}</b> avaliações
            publicadas deste modelo
          </div>

          <div className="pdp-reviews-list">
            {shownReviews.map((rev) => (
              <div className="pdp-review-item" key={rev.id}>
                <div className="pdp-review-head">
                  <span className="pdp-review-stars">{'★'.repeat(rev.rating)}</span>
                  <b>{rev.author}</b>
                  <small>
                    {rev.city} • {rev.date}
                  </small>
                </div>
                <p>{rev.comment}</p>
              </div>
            ))}
          </div>

          {filteredReviews.length > 10 && (
            <div className="pdp-reviews-pagination">
              {visibleReviewsCount < filteredReviews.length && (
                <>
                  <button
                    type="button"
                    className="pdp-rev-more-btn"
                    onClick={() =>
                      setVisibleReviewsCount((c) => Math.min(filteredReviews.length, c + 15))
                    }
                  >
                    Ver mais {Math.min(15, filteredReviews.length - visibleReviewsCount)} avaliações
                  </button>
                  <button
                    type="button"
                    className="pdp-rev-all-btn"
                    onClick={() => setVisibleReviewsCount(filteredReviews.length)}
                  >
                    Ver todas ({filteredReviews.length})
                  </button>
                </>
              )}
              {visibleReviewsCount > 10 && (
                <button
                  type="button"
                  className="pdp-rev-collapse-btn"
                  onClick={() => setVisibleReviewsCount(10)}
                >
                  Mostrar menos
                </button>
              )}
            </div>
          )}

          <form className="pdp-review-form" onSubmit={handleAddReview}>
            <b>Deixe sua avaliação</b>
            <p className="pdp-review-moderation-note">
              Para manter a transparência, todo comentário passa pela aprovação da nossa equipe antes
              de ser publicado na página.
            </p>
            {reviewSubmittedNotice && (
              <div className="pdp-review-submitted-banner">
                ✓ Avaliação recebida! Ela aparecerá no site assim que for aprovada pelo administrador.
              </div>
            )}
            <div className="pdp-review-inputs">
              <input
                type="text"
                placeholder="Seu nome"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                required
              />
              <select
                value={reviewStars}
                onChange={(e) => setReviewStars(Number(e.target.value))}
              >
                <option value={5}>5 estrelas</option>
                <option value={4}>4 estrelas</option>
                <option value={3}>3 estrelas</option>
              </select>
            </div>
            <div className="pdp-cep-form">
              <input
                type="text"
                placeholder="Conte como foi sua experiência com este aparelho..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                required
              />
              <button type="submit" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Produtos relacionados */}
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Quem viu este produto também gostou</h2>
            <p>Clique em outro item para ver fotos, garantia e detalhes.</p>
          </div>
          <button
            type="button"
            className="seeall"
            style={{ border: 0, background: 'none' }}
            onClick={() => onOpenProduct(relatedProducts[0]?.id ?? product.id)}
          >
            Ver destaque →
          </button>
        </div>
        <div className="products">{relatedProducts.map(renderProductCard)}</div>
      </section>

      {/* Visualizador em Tela Cheia (Lightbox com Zoom 2x e Navegação) */}
      {zoomOpen && activePhoto && (
        <div
          className="pdp-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de fotos: ${product.name}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomOpen(false);
          }}
        >
          <div className="pdp-lightbox-topbar">
            <div className="pdp-lightbox-title">
              <strong>{product.name}</strong>
              <span>
                Foto {safeIdx + 1} de {gallery.length}
              </span>
            </div>
            <div className="pdp-lightbox-actions">
              <button
                type="button"
                className={`pdp-lightbox-btn ${lightboxZoomed ? 'active' : ''}`}
                onClick={() => {
                  setZoomOrigin({ x: 50, y: 50 });
                  setLightboxZoomed((z) => !z);
                }}
              >
                {lightboxZoomed ? <ZoomOut size={17} /> : <ZoomIn size={17} />}
                <span>{lightboxZoomed ? 'Reduzir (1x)' : 'Zoom (2x)'}</span>
              </button>
              <button
                type="button"
                className="pdp-lightbox-close"
                aria-label="Fechar visualizador"
                onClick={() => setZoomOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div
            className="pdp-lightbox-stage"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseMove={handleLightboxMouseMove}
            onClick={(e) => {
              if (e.target === e.currentTarget) setZoomOpen(false);
            }}
          >
            {gallery.length > 1 && (
              <button
                type="button"
                className="pdp-lightbox-nav prev"
                aria-label="Foto anterior"
                onClick={goPrevPhoto}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <div className={`pdp-lightbox-frame ${lightboxZoomed ? 'zoomed' : ''}`}>
              <img
                src={activePhoto}
                alt={`${product.name} ampliada - foto ${safeIdx + 1}`}
                referrerPolicy="no-referrer"
                style={
                  lightboxZoomed
                    ? {
                        transform: 'scale(2)',
                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                        cursor: 'zoom-out',
                      }
                    : { cursor: 'zoom-in' }
                }
                onClick={() => {
                  setZoomOrigin({ x: 50, y: 50 });
                  setLightboxZoomed((z) => !z);
                }}
              />
            </div>

            {gallery.length > 1 && (
              <button
                type="button"
                className="pdp-lightbox-nav next"
                aria-label="Próxima foto"
                onClick={goNextPhoto}
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="pdp-lightbox-thumbs">
              {gallery.map((u, i) => (
                <button
                  key={`lb-${u}-${i}`}
                  type="button"
                  className={`pdp-thumb ${safeIdx === i ? 'active' : ''}`}
                  aria-label={`Ver foto ${i + 1}`}
                  onClick={() => {
                    setLightboxZoomed(false);
                    setActivePhotoIdx(i);
                  }}
                >
                  <img src={u} alt={`Miniatura ${i + 1}`} referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra fixa de compra no Mobile */}
      <div className="pdp-mobile-sticky-bar">
        <div className="pdp-mobile-sticky-price">
          <strong>{money(product.price)}</strong>
          <span>À vista no PIX</span>
        </div>
        <button
          type="button"
          className="pdp-mobile-sticky-bag"
          onClick={() => onAddCart(product.id, qty, true)}
        >
          + Sacola
        </button>
        <button
          type="button"
          className="pdp-mobile-sticky-buy"
          onClick={() => onBuyNow(product.id, qty)}
        >
          Comprar agora
        </button>
      </div>
    </section>
  );
}
