import { useState, useEffect, useRef } from 'react';
import { Modal, Btn, Badge } from './ui';
import ConfirmDialog from './ui/ConfirmDialog';
import T from '../theme';
import {
  apiGetProduct, resolveMediaUrl,
  apiUploadProductMedia, apiSetProductMediaPrimary,
  apiGetListingMedia, apiUploadListingMedia, apiSetListingMediaPrimary, apiDeleteListingMedia,
} from '../lib/api';

const ACCEPT_IMAGE = 'image/jpeg,image/png';
const ACCEPT_DOC = 'application/pdf,image/jpeg,image/png';
const MAX_MB = 10;

function fileNameFromUrl(url = '') {
  const last = url.split('/').pop() || 'document';
  return decodeURIComponent(last);
}

/**
 * Upload + manage a listing's display picture and supporting documents.
 *
 * mode="product"  -> Product's own media endpoints (upload, set-primary).
 *                    The backend has no delete endpoint for product media
 *                    yet, so delete is not offered here.
 * mode="listing"  -> Generic ListingMedia endpoints shared by warehouse,
 *                    testing_agency, and transport profiles (upload,
 *                    set-primary, delete). Requires `entityType`.
 */
export default function MediaManagerModal({
  mode,
  entityType,
  entityId,
  title = 'Manage Photos & Documents',
  onClose,
  onPrimaryChange,
}) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [error, setError] = useState('');
  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);

  const canDelete = mode === 'listing';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = [];
        if (mode === 'product') {
          const p = await apiGetProduct(entityId);
          list = p?.media || [];
        } else {
          list = await apiGetListingMedia(entityType, entityId);
        }
        if (!cancelled) setMedia(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setError('Could not load existing media.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode, entityType, entityId]);

  const images = media.filter(m => m.type === 'image');
  const documents = media.filter(m => m.type !== 'image');

  const tooLarge = (files) => files.find(f => f.size > MAX_MB * 1024 * 1024);

  const handleUpload = async (fileList, type) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const big = tooLarge(files);
    if (big) { setError(`"${big.name}" is larger than ${MAX_MB}MB.`); return; }

    setError('');
    type === 'image' ? setUploadingPhotos(true) : setUploadingDocs(true);
    try {
      const created = mode === 'product'
        ? await apiUploadProductMedia(entityId, files, type)
        : await apiUploadListingMedia(entityType, entityId, files, type);
      const createdList = Array.isArray(created) ? created : [created];
      setMedia(prev => [...prev, ...createdList]);
      const newPrimary = createdList.find(m => m.isPrimary);
      if (newPrimary && onPrimaryChange) onPrimaryChange(resolveMediaUrl(newPrimary.url));
    } catch (e) {
      setError(e.message || 'Upload failed. Only JPG, PNG, and PDF files are accepted.');
    } finally {
      setUploadingPhotos(false);
      setUploadingDocs(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const setPrimary = async (m) => {
    setError('');
    try {
      if (mode === 'product') await apiSetProductMediaPrimary(m.id);
      else await apiSetListingMediaPrimary(m.id);
      setMedia(prev => prev.map(x => (x.type === 'image' ? { ...x, isPrimary: x.id === m.id } : x)));
      if (onPrimaryChange) onPrimaryChange(resolveMediaUrl(m.url));
    } catch (e) {
      setError(e.message || 'Could not set display picture.');
    }
  };

  const removeMedia = (m) => { if (canDelete) setRemoveTarget(m); };
  const doRemove = async (m) => {
    setError('');
    await apiDeleteListingMedia(m.id);
    setMedia(prev => prev.filter(x => x.id !== m.id));
  };

  return (
    <Modal title={title} onClose={onClose} width={620}>
      {removeTarget && (
        <ConfirmDialog
          title="Remove file" danger confirmLabel="Remove file"
          description="Remove this file from the listing?"
          consequences={['The file is deleted permanently.']}
          onConfirm={() => doRemove(removeTarget)}
          onClose={() => setRemoveTarget(null)}
        />
      )}
      {loading ? (
        <p style={{ fontSize: 13, color: T.muted }}>Loading…</p>
      ) : (
        <>
          {error && (
            <div style={{ fontSize: 12, color: T.danger, marginBottom: 14, background: '#FEE2E2', padding: '8px 12px', borderRadius: 7 }}>
              ⚠ {error}
            </div>
          )}

          {/* ─── PHOTOS ─────────────────────────────────────────────── */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: T.green }}>📷 Photos</h4>
              <Btn
                variant="secondary" size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhotos}
              >
                {uploadingPhotos ? 'Uploading…' : '+ Add Photos'}
              </Btn>
              <input
                ref={photoInputRef} type="file" accept={ACCEPT_IMAGE} multiple hidden
                onChange={e => handleUpload(e.target.files, 'image')}
              />
            </div>

            {images.length === 0 ? (
              <div style={{ border: `2px dashed ${T.border}`, borderRadius: 10, padding: '22px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
                <p style={{ margin: 0, fontSize: 12, color: T.muted }}>
                  No photos yet. The first one you add becomes the display picture.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
                {images.map(m => (
                  <div key={m.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `2px solid ${m.isPrimary ? T.gold : T.border}` }}>
                    <img src={resolveMediaUrl(m.url)} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                    {m.isPrimary && (
                      <div style={{ position: 'absolute', top: 5, left: 5 }}>
                        <Badge label="★ Display" type="gold" />
                      </div>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => removeMedia(m)}
                        title="Remove"
                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontSize: 12, lineHeight: '22px' }}
                      >
                        ✕
                      </button>
                    )}
                    {!m.isPrimary && (
                      <button
                        onClick={() => setPrimary(m)}
                        style={{ position: 'absolute', bottom: 4, left: 4, right: 4, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 4px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}
                      >
                        Set as Display
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── DOCUMENTS ──────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: T.green }}>📄 Documents</h4>
              <Btn
                variant="secondary" size="sm"
                onClick={() => docInputRef.current?.click()}
                disabled={uploadingDocs}
              >
                {uploadingDocs ? 'Uploading…' : '+ Add Document'}
              </Btn>
              <input
                ref={docInputRef} type="file" accept={ACCEPT_DOC} multiple hidden
                onChange={e => handleUpload(e.target.files, 'document')}
              />
            </div>

            {documents.length === 0 ? (
              <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>
                No documents attached yet. Certificates, lab reports, or licenses can go here.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {documents.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.label || fileNameFromUrl(m.url)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                      <a href={resolveMediaUrl(m.url)} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: T.mid, textDecoration: 'none' }}>
                        View →
                      </a>
                      {canDelete && (
                        <button onClick={() => removeMedia(m)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 12 }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p style={{ fontSize: 10.5, color: T.muted, marginTop: 18, marginBottom: 0 }}>
            JPG, PNG, or PDF only · up to {MAX_MB}MB per file.
          </p>
        </>
      )}
    </Modal>
  );
}
