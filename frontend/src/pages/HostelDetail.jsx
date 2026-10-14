import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BedDouble,
  BedSingle,
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  GitCompareArrows,
  GraduationCap,
  Hourglass,
  ImagePlus,
  Link2,
  MapPin,
  MessageSquarePlus,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { api, notifyModerationChanged } from '../api/client.js';
import { AmenityList } from '../components/AmenityList.jsx';
import { AcBadge, StatusBadge, TypeBadge, VerifiedBadge } from '../components/Badges.jsx';
import Lightbox from '../components/Lightbox.jsx';
import PhotoGallery from '../components/PhotoGallery.jsx';
import RatingBreakdown from '../components/RatingBreakdown.jsx';
import { StarRating } from '../components/Stars.jsx';
import { Avatar, EmptyState, ErrorState, PageLoader } from '../components/ui.jsx';
import PhotoUploadModal from '../components/modals/PhotoUploadModal.jsx';
import ReviewModal from '../components/modals/ReviewModal.jsx';
import RoomFormModal from '../components/modals/RoomFormModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCompare } from '../context/CompareContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  acSummary,
  floorLabel,
  formatDate,
  formatPrice,
  formatYearly,
  roomTypeLabel,
  sharingLabel,
  sharingRange,
  timeAgo,
  toYearly,
  typeLabel,
} from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

const roomIcon = (capacity) => (capacity === 1 ? BedSingle : capacity === 2 ? BedDouble : Users);

export default function HostelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { has, toggle } = useCompare();

  const { data, loading, error, reload } = useApi(() => api.get(`/hostels/${id}`), [id, user?.user_id, user?.role, user?.is_verified]);
  const [lightbox, setLightbox] = useState({ photos: [], index: null });
  const [roomModal, setRoomModal] = useState({ open: false, room: null });
  const [photoModal, setPhotoModal] = useState({ open: false, roomId: '' });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSort, setReviewSort] = useState('newest');

  useDocumentTitle(data?.hostel?.name);

  const reviews = useMemo(() => {
    const list = [...(data?.hostel?.reviews ?? [])];
    if (reviewSort === 'highest') list.sort((a, b) => b.rating - a.rating || new Date(b.created_at) - new Date(a.created_at));
    if (reviewSort === 'lowest') list.sort((a, b) => a.rating - b.rating || new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [data, reviewSort]);

  if (loading && !data) return <PageLoader />;
  if (error) {
    return (
      <div className="container-page py-16">
        {error.status === 404 ? (
          <EmptyState icon={Building2} title="Hostel not found" action={<Link to="/hostels" className="btn btn-primary">Browse hostels</Link>}>
            It may have been removed, or it is still waiting for moderation.
          </EmptyState>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </div>
    );
  }

  const { hostel, permissions: perm, mine } = data;
  const inCompare = has(hostel.hostel_id);
  const myLiveReviews = (mine?.reviews ?? []).filter((r) => r.status !== 'rejected');
  const myPendingReviews = (mine?.reviews ?? []).filter((r) => r.status === 'pending').length;
  const canWriteMore = perm.can_review && myLiveReviews.length < 1 + hostel.rooms.length;

  const openRoomPhotos = (roomId) => {
    const photos = hostel.photos.filter((p) => p.room_id === roomId);
    if (photos.length) setLightbox({ photos, index: 0 });
  };

  const moderate = async (status) => {
    try {
      await api.patch(`/admin/moderation/hostels/${hostel.hostel_id}`, { status });
      toast.success(`Hostel ${status}.`);
      notifyModerationChanged();
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const deleteHostel = async () => {
    const ok = await confirm({
      title: 'Delete this hostel?',
      message: `“${hostel.name}” and all of its rooms, photos and reviews will be permanently removed.`,
      confirmText: 'Delete hostel',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/hostels/${hostel.hostel_id}`);
      toast.success('Hostel deleted.');
      notifyModerationChanged();
      navigate(perm.can_moderate ? '/admin/hostels' : '/account?tab=submissions');
    } catch (err) {
      toast.error(err);
    }
  };

  const deleteRoom = async (room) => {
    const ok = await confirm({
      title: 'Delete this room?',
      message: `The ${roomTypeLabel(room.room_type).toLowerCase()} room will be removed. Its photos and reviews stay, but become hostel-level.`,
      confirmText: 'Delete room',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/rooms/${room.room_id}`);
      toast.success('Room deleted.');
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const deleteReview = async (review) => {
    const ok = await confirm({ title: 'Delete this review?', message: 'The hostel rating will be recalculated.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.del(`/reviews/${review.review_id}`);
      toast.success('Review deleted.');
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.info(window.location.href);
    }
  };

  const contributeButtons = perm.can_contribute && (
    <div className="grid gap-2">
      <button className="btn btn-primary" onClick={() => setPhotoModal({ open: true, roomId: '' })}>
        <ImagePlus className="h-4 w-4" /> Upload photos
      </button>
      {perm.can_review && (
        <button className="btn btn-secondary" onClick={() => setReviewOpen(true)} disabled={!canWriteMore}>
          <MessageSquarePlus className="h-4 w-4" /> {canWriteMore ? 'Write a review' : 'Already reviewed'}
        </button>
      )}
      <button className="btn btn-secondary" onClick={() => setRoomModal({ open: true, room: null })}>
        <Plus className="h-4 w-4" /> Add a room
      </button>
    </div>
  );

  return (
    <div className="pb-10">
      {hostel.status !== 'approved' && (
        <div className={hostel.status === 'pending' ? 'bg-amber-50 text-amber-900' : 'bg-rose-50 text-rose-900'}>
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <p className="flex items-center gap-2">
              {hostel.status === 'pending' ? <Hourglass className="h-4 w-4 shrink-0" /> : <CircleX className="h-4 w-4 shrink-0" />}
              {hostel.status === 'pending'
                ? `Pending moderation — only ${perm.is_owner ? 'you' : 'the submitter'} and admins can see this hostel until it is approved.`
                : 'This submission was rejected by a moderator and is hidden from the public.'}
              {hostel.status === 'rejected' && perm.can_edit && !perm.can_moderate && ' Edit it to re-submit.'}
            </p>
            {perm.can_moderate && (
              <div className="flex gap-2">
                {hostel.status !== 'approved' && (
                  <button className="btn btn-success btn-sm" onClick={() => moderate('approved')}>
                    <Check className="h-4 w-4" /> Approve
                  </button>
                )}
                {hostel.status !== 'rejected' && (
                  <button className="btn btn-danger btn-sm" onClick={() => moderate('rejected')}>
                    <CircleX className="h-4 w-4" /> Reject
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container-page pt-6">
        <nav className="flex items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link to="/hostels" className="hover:text-slate-800">
            Explore
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to={`/hostels?college_id=${hostel.college.college_id}`} className="truncate hover:text-slate-800">
            {hostel.college.name}
          </Link>
          <ChevronRight className="h-4 w-4 shrink-0" />
          <span className="truncate text-slate-800">{hostel.name}</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={hostel.type} />
              {hostel.status !== 'approved' && <StatusBadge status={hostel.status} />}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{hostel.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <a href="#reviews" className="inline-flex items-center gap-1.5 hover:text-slate-900">
                <StarRating value={hostel.avg_rating} />
                <span className="font-semibold text-slate-900">{hostel.review_count ? hostel.avg_rating.toFixed(1) : 'New'}</span>
                <span>
                  ({hostel.review_count} review{hostel.review_count === 1 ? '' : 's'})
                </span>
              </a>
              <Link to={`/hostels?college_id=${hostel.college.college_id}`} className="inline-flex items-center gap-1.5 hover:text-slate-900">
                <GraduationCap className="h-4 w-4" /> {hostel.college.name}
              </Link>
              {hostel.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {hostel.address}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {hostel.status === 'approved' && (
              <button className={`btn ${inCompare ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle(hostel)}>
                {inCompare ? <Check className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
                {inCompare ? 'In compare' : 'Compare'}
              </button>
            )}
            <button className="btn btn-secondary" onClick={share} title="Copy link">
              <Link2 className="h-4 w-4" /> Share
            </button>
            {perm.can_edit && (
              <Link to={`/hostels/${hostel.hostel_id}/edit`} className="btn btn-secondary">
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            )}
            {perm.can_delete && (
              <button className="btn btn-danger-soft" onClick={deleteHostel}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <PhotoGallery
            photos={hostel.photos}
            type={hostel.type}
            onOpen={(index) => setLightbox({ photos: hostel.photos, index })}
            emptyAction={
              perm.can_contribute && (
                <button className="btn btn-sm bg-white text-slate-800 hover:bg-slate-100" onClick={() => setPhotoModal({ open: true, roomId: '' })}>
                  <ImagePlus className="h-4 w-4" /> Upload the first photo
                </button>
              )
            }
          />
          {mine?.pending_photos > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
              <Hourglass className="h-4 w-4" /> You have {mine.pending_photos} photo{mine.pending_photos === 1 ? '' : 's'} waiting for
              moderation.
            </p>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section className="card p-6">
              <h2 className="text-xl font-semibold text-slate-900">About this hostel</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                <Fact label="Type" value={`${typeLabel(hostel.type)} hostel`} />
                <Fact label="City" value={hostel.college.city} />
                <Fact label="Students / room" value={sharingRange(hostel.sharing) ?? '—'} />
                <Fact label="Air-conditioning" value={acSummary(hostel) ?? '—'} />
                <Fact label="Free beds" value={hostel.free_beds} highlight={hostel.free_beds > 0} />
              </dl>
              <h3 className="mt-6 mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">Amenities</h3>
              <AmenityList amenities={hostel.amenities} />
            </section>

            <section id="rooms" className="card scroll-mt-24 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Rooms &amp; prices</h2>
                  <p className="text-sm text-slate-500">Yearly fee per student (room + mess) · free beds as reported by students</p>
                </div>
                {perm.can_contribute && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setRoomModal({ open: true, room: null })}>
                    <Plus className="h-4 w-4" /> Add room
                  </button>
                )}
              </div>
              {hostel.rooms.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {hostel.rooms.map((room) => {
                    const Icon = roomIcon(room.capacity);
                    return (
                      <div key={room.room_id} className="rounded-xl p-4 ring-1 ring-slate-200 transition hover:ring-brand-200">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{roomTypeLabel(room.room_type)}</p>
                              <p className="text-xs text-slate-500">
                                {sharingLabel(room.capacity)}
                                {room.floor_no !== null ? ` · ${floorLabel(room.floor_no)}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">{formatYearly(room.price_per_month)}</p>
                            <p className="text-xs whitespace-nowrap text-slate-500">per year</p>
                            <p className="text-[11px] whitespace-nowrap text-slate-400">≈ {formatPrice(toYearly(room.price_per_month) / 12)}/month</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <AcBadge ac={room.is_ac} />
                            <span
                              className={`badge ${room.availability > 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-slate-100 text-slate-500 ring-slate-300/40'}`}
                            >
                              {room.availability > 0 ? `${room.availability} bed${room.availability === 1 ? '' : 's'} free` : 'Full'}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            {room.photo_count > 0 && (
                              <button onClick={() => openRoomPhotos(room.room_id)} className="btn btn-ghost btn-sm">
                                <Camera className="h-3.5 w-3.5" /> {room.photo_count}
                              </button>
                            )}
                            {perm.can_contribute && (
                              <button
                                onClick={() => setPhotoModal({ open: true, roomId: room.room_id })}
                                className="btn btn-ghost btn-sm"
                                title="Add photos of this room"
                              >
                                <ImagePlus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {perm.can_manage_rooms && (
                              <>
                                <button onClick={() => setRoomModal({ open: true, room })} className="btn btn-ghost btn-sm" title="Edit room">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteRoom(room)}
                                  className="btn btn-ghost btn-sm hover:bg-rose-50 hover:text-rose-600"
                                  title="Delete room"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={BedDouble} title="No rooms listed yet" className="mt-5 py-8">
                  {perm.can_contribute ? 'Add the room types, prices and free beds you know about.' : 'Students have not added room details yet.'}
                </EmptyState>
              )}
            </section>

            <section id="reviews" className="card scroll-mt-24 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">Student reviews</h2>
                {perm.can_review && (
                  <button className="btn btn-primary btn-sm" onClick={() => setReviewOpen(true)} disabled={!canWriteMore}>
                    <MessageSquarePlus className="h-4 w-4" /> {canWriteMore ? 'Write a review' : 'Already reviewed'}
                  </button>
                )}
              </div>
              <div className="mt-5">
                <RatingBreakdown average={hostel.avg_rating} count={hostel.review_count} distribution={hostel.rating_distribution} />
              </div>
              {myPendingReviews > 0 && (
                <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <Hourglass className="h-4 w-4" /> Your review{myPendingReviews > 1 ? 's are' : ' is'} waiting for moderation.
                </p>
              )}

              {reviews.length > 0 ? (
                <>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                    <p className="text-sm text-slate-500">
                      {reviews.length} review{reviews.length === 1 ? '' : 's'}
                    </p>
                    <select className="input w-auto py-1.5 text-xs" value={reviewSort} onChange={(e) => setReviewSort(e.target.value)} aria-label="Sort reviews">
                      <option value="newest">Newest first</option>
                      <option value="highest">Highest rated</option>
                      <option value="lowest">Lowest rated</option>
                    </select>
                  </div>
                  <ul className="mt-4 space-y-5">
                    {reviews.map((r) => (
                      <li key={r.review_id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <Avatar name={r.author_name} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-slate-900">{r.author_name}</p>
                                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                                  {r.author_verified && <VerifiedBadge label={`Verified · ${r.author_college ?? 'student'}`} />}
                                  <span>{timeAgo(r.created_at)}</span>
                                </div>
                              </div>
                              {(perm.can_moderate || r.user_id === user?.user_id) && (
                                <button
                                  onClick={() => deleteReview(r)}
                                  className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  title="Delete review"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <StarRating value={r.rating} size="h-3.5 w-3.5" />
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                                {r.room_type
                                  ? `${roomTypeLabel(r.room_type)}${r.room_is_ac === null ? '' : r.room_is_ac ? ' · AC' : ' · non-AC'}`
                                  : 'Hostel overall'}
                              </span>
                            </div>
                            {r.title && <p className="mt-2 font-semibold text-slate-900">{r.title}</p>}
                            {r.comment && <p className="mt-1 text-sm leading-6 whitespace-pre-line text-slate-600">{r.comment}</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
                  No approved reviews yet. {perm.can_review ? 'Be the first to write one!' : ''}
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-4 self-start lg:sticky lg:top-24">
            <div className="card p-5">
              <p className="text-sm text-slate-500">{hostel.min_price !== null ? 'Yearly fee from' : 'Pricing'}</p>
              <p className="mt-0.5 text-3xl font-bold text-slate-900">
                {hostel.min_price !== null ? formatYearly(hostel.min_price) : '—'}
                {hostel.min_price !== null && <span className="text-base font-normal text-slate-500"> /year</span>}
              </p>
              {hostel.max_price !== null && hostel.max_price !== hostel.min_price && (
                <p className="text-sm text-slate-500">up to {formatYearly(hostel.max_price)} for the most expensive room</p>
              )}
              {(hostel.min_ac_price !== null || hostel.min_non_ac_price !== null) && (
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-sky-50 px-2.5 py-2 ring-1 ring-sky-100">
                    <dt className="text-xs text-sky-700">AC from</dt>
                    <dd className="font-semibold text-slate-900">{hostel.min_ac_price !== null ? formatYearly(hostel.min_ac_price) : '—'}</dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200">
                    <dt className="text-xs text-slate-500">Non-AC from</dt>
                    <dd className="font-semibold text-slate-900">{hostel.min_non_ac_price !== null ? formatYearly(hostel.min_non_ac_price) : '—'}</dd>
                  </div>
                </dl>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {hostel.sharing.map((c) => (
                  <span key={c} className="badge bg-slate-100 text-slate-700 ring-slate-300/40">
                    {sharingLabel(c)}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-4 text-slate-400">
                Approx. room + mess fee for one academic year, excluding refundable deposits. Confirm with the college before paying.
              </p>
              <p className={`mt-4 flex items-center gap-2 text-sm font-medium ${hostel.free_beds > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                <BedDouble className="h-4 w-4" />
                {hostel.free_beds > 0 ? `${hostel.free_beds} bed${hostel.free_beds === 1 ? '' : 's'} currently free` : 'No free beds reported'}
              </p>
              {hostel.status === 'approved' && (
                <div className="mt-5 grid gap-2">
                  <button className={`btn ${inCompare ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle(hostel)}>
                    {inCompare ? <Check className="h-4 w-4" /> : <GitCompareArrows className="h-4 w-4" />}
                    {inCompare ? 'Added to compare' : 'Add to compare'}
                  </button>
                  {inCompare && (
                    <Link to="/compare" className="text-center text-sm font-semibold text-brand-700 hover:underline">
                      Open comparison →
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-900">Live here? Help future students</h3>
              {perm.can_contribute ? (
                <>
                  <p className="mt-1 mb-4 text-sm text-slate-500">
                    {perm.can_moderate ? 'Admin contributions are published immediately.' : 'Everything you add is checked by a moderator first.'}
                  </p>
                  {contributeButtons}
                </>
              ) : (
                <>
                  <p className="mt-1 text-sm text-slate-500">{perm.reason}</p>
                  <div className="mt-4">
                    {!user ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Link to="/login" state={{ from: { pathname: `/hostels/${hostel.hostel_id}` } }} className="btn btn-secondary">
                          Log in
                        </Link>
                        <Link to="/register?type=student" className="btn btn-primary">
                          Sign up
                        </Link>
                      </div>
                    ) : user.role !== 'admin' && !(user.role === 'student' && user.is_verified) ? (
                      <Link to="/verify" className="btn btn-primary w-full">
                        <ShieldCheck className="h-4 w-4" /> Verify college email
                      </Link>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            {hostel.submitter && (
              <div className="card flex items-center gap-3 p-5">
                <Avatar name={hostel.submitter.name} size="h-11 w-11" />
                <div className="min-w-0 text-sm">
                  <p className="text-xs text-slate-500">Listed by</p>
                  <p className="truncate font-semibold text-slate-900">{hostel.submitter.name}</p>
                  {hostel.submitter.role === 'admin' ? (
                    <p className="text-xs text-violet-700">HostelView moderator</p>
                  ) : (
                    hostel.submitter.is_verified && <VerifiedBadge label={hostel.submitter.college_name ?? 'Verified student'} />
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" /> {formatDate(hostel.created_at)}
                    {hostel.updated_at && ` · edited ${timeAgo(hostel.updated_at)}`}
                  </p>
                </div>
              </div>
            )}

            {perm.can_moderate && (
              <div className="card border-l-4 border-violet-500 p-5">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-violet-600" /> Moderation
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Current status: <StatusBadge status={hostel.status} />
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button className="btn btn-success btn-sm" onClick={() => moderate('approved')} disabled={hostel.status === 'approved'}>
                    <CircleCheck className="h-4 w-4" /> Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => moderate('rejected')} disabled={hostel.status === 'rejected'}>
                    <CircleX className="h-4 w-4" /> Reject
                  </button>
                </div>
                <Link to="/admin/moderation" className="mt-3 block text-sm font-semibold text-violet-700 hover:underline">
                  Open moderation queue →
                </Link>
              </div>
            )}
          </aside>
        </div>
      </div>

      <Lightbox photos={lightbox.photos} index={lightbox.index} onClose={() => setLightbox({ photos: [], index: null })} />
      <RoomFormModal
        open={roomModal.open}
        room={roomModal.room}
        hostelId={hostel.hostel_id}
        onClose={() => setRoomModal({ open: false, room: null })}
        onSaved={reload}
      />
      <PhotoUploadModal
        open={photoModal.open}
        hostel={hostel}
        defaultRoomId={photoModal.roomId}
        onClose={() => setPhotoModal({ open: false, roomId: '' })}
        onUploaded={() => {
          reload();
          notifyModerationChanged();
        }}
      />
      <ReviewModal
        open={reviewOpen}
        hostel={hostel}
        myReviews={mine?.reviews ?? []}
        onClose={() => setReviewOpen(false)}
        onSubmitted={() => {
          reload();
          notifyModerationChanged();
        }}
      />
    </div>
  );
}

function Fact({ label, value, highlight }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`mt-0.5 truncate font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</dd>
    </div>
  );
}
