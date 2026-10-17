'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Loading, Modal, PageHeader, Progress, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { GROUP_LABELS, GROUP_TONE, formatDate } from '@/lib/format';
import type { Group, GroupStatus, Paginated, Pilgrim } from '@/lib/types';

const GROUP_STATUSES = Object.keys(GROUP_LABELS) as GroupStatus[];

export default function GroupsPage() {
  const { canWrite, canManage, canVerify } = useAuth();
  const { notify } = useToast();

  const [groups, setGroups] = useState<Group[] | null>(null);
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [busy, setBusy] = useState(false);

  const [memberGroup, setMemberGroup] = useState<Group | null>(null);
  const [memberPilgrimId, setMemberPilgrimId] = useState('');
  const [isLeader, setIsLeader] = useState(false);
  const [memberError, setMemberError] = useState('');

  const load = useCallback(async () => {
    try {
      const [groupsRes, pilgrimsRes] = await Promise.all([
        api<Group[]>('/groups'),
        api<Paginated<Pilgrim>>('/pilgrims?limit=100'),
      ]);
      setGroups(groupsRes);
      setPilgrims(pilgrimsRes.items);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل المجموعات');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      name: String(form.get('name') ?? ''),
      maxSize: Number(form.get('maxSize') ?? 4),
      status: String(form.get('status') ?? 'DRAFT'),
    };
    const description = String(form.get('description') ?? '').trim();
    if (description) payload.description = description;
    const scheduledDate = String(form.get('scheduledDate') ?? '');
    if (scheduledDate) payload.scheduledDate = scheduledDate;

    setBusy(true);
    setCreateError('');
    try {
      await api<Group>('/groups', { method: 'POST', body: payload });
      setCreateOpen(false);
      notify('تم إنشاء المجموعة');
      await load();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'تعذّر الإنشاء');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberGroup || !memberPilgrimId) return;
    setBusy(true);
    setMemberError('');
    try {
      await api(`/groups/${memberGroup.id}/members`, {
        method: 'POST',
        body: { pilgrimId: memberPilgrimId, isLeader },
      });
      notify('تمت إضافة العضو');
      setMemberGroup(null);
      setMemberPilgrimId('');
      setIsLeader(false);
      await load();
    } catch (err) {
      setMemberError(err instanceof ApiError ? err.message : 'تعذّرت الإضافة');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(group: Group, pilgrimId: string) {
    try {
      await api(`/groups/${group.id}/members/${pilgrimId}`, { method: 'DELETE' });
      notify('أُزيل العضو');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّرت الإزالة', true);
    }
  }

  async function handleDeleteGroup(group: Group) {
    if (!window.confirm(`حذف ${group.name}؟`)) return;
    try {
      await api(`/groups/${group.id}`, { method: 'DELETE' });
      notify('تم حذف المجموعة');
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'تعذّر الحذف', true);
    }
  }

  return (
    <>
      <PageHeader
        title="المجموعات"
        subtitle={groups ? `${groups.length} مجموعة · مقاعد متاحة ${groups.reduce((sum, group) => sum + Math.max(0, group.maxSize - group.members.length), 0)}` : '…'}
        actions={
          canWrite ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setCreateError('');
                setCreateOpen(true);
              }}
            >
              + مجموعة جديدة
            </button>
          ) : null
        }
      />

      {error ? <div className="form-error" style={{ marginBottom: 14 }}>{error}</div> : null}

      {!groups ? (
        <Loading />
      ) : groups.length === 0 ? (
        <section className="panel">
          <div className="empty">لا توجد مجموعات بعد</div>
        </section>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {groups.map((group) => {
            const percent = Math.min(100, Math.round((group.members.length / group.maxSize) * 100));
            const full = group.members.length >= group.maxSize;
            return (
              <section className="panel" key={group.id}>
                <div className="panel-head">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{group.name}</div>
                    {group.description ? (
                      <div className="text-xs muted">{group.description}</div>
                    ) : null}
                  </div>
                  <span style={{ marginInlineStart: 'auto' }}>
                    <Badge tone={GROUP_TONE[group.status]}>{GROUP_LABELS[group.status]}</Badge>
                  </span>
                </div>
                <div className="panel-body grid" style={{ gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)' }}>
                    <span>
                      {group.members.length} / {group.maxSize} عضو
                    </span>
                    <span>{formatDate(group.scheduledDate)}</span>
                  </div>
                  <Progress percent={percent} />

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {group.members.length === 0 ? (
                      <span className="text-xs muted">لا يوجد أعضاء بعد</span>
                    ) : (
                      group.members.map((member) => (
                        <span
                          key={member.id}
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 999,
                            border: '1px solid var(--border)',
                            background: 'rgba(255,255,255,0.04)',
                            color: member.isLeader ? 'var(--gold)' : '#cfdad5',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {member.isLeader ? '★ ' : ''}
                          {member.pilgrim?.fullNameAr ?? member.pilgrimId}
                          {canVerify ? (
                            <button
                              type="button"
                              title="إزالة"
                              onClick={() => handleRemoveMember(group, member.pilgrimId)}
                              style={{
                                border: 0,
                                background: 'transparent',
                                color: 'var(--muted)',
                                fontSize: 12,
                                lineHeight: 1,
                                padding: 0,
                              }}
                            >
                              ×
                            </button>
                          ) : null}
                        </span>
                      ))
                    )}
                  </div>

                  {canWrite ? (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn ghost small"
                        disabled={full}
                        onClick={() => {
                          setMemberGroup(group);
                          setMemberPilgrimId('');
                          setIsLeader(false);
                          setMemberError('');
                        }}
                      >
                        {full ? 'مكتملة' : '+ عضو'}
                      </button>
                      {canManage ? (
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={() => handleDeleteGroup(group)}
                        >
                          حذف
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={createOpen}
        title="إنشاء مجموعة"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn ghost" onClick={() => setCreateOpen(false)}>
              إلغاء
            </button>
            <button type="submit" form="create-group" className="btn" disabled={busy}>
              {busy ? 'جارٍ الإنشاء…' : 'إنشاء'}
            </button>
          </>
        }
      >
        {createError ? <div className="form-error">{createError}</div> : null}
        <form id="create-group" className="form-grid" onSubmit={handleCreate}>
          <label className="field full">
            اسم المجموعة *
            <input className="input" name="name" required minLength={2} maxLength={120} placeholder="مجموعة الرحمة — ربيع الأول" />
          </label>
          <label className="field">
            الحد الأقصى للأعضاء
            <input className="input" name="maxSize" type="number" min={1} max={20} defaultValue={4} />
          </label>
          <label className="field">
            الحالة
            <select className="select" name="status" defaultValue="DRAFT">
              {GROUP_STATUSES.slice(0, 4).map((status) => (
                <option key={status} value={status}>
                  {GROUP_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="field full">
            تاريخ الرحلة
            <input className="input" name="scheduledDate" type="date" />
          </label>
          <label className="field full">
            وصف
            <textarea className="textarea" name="description" rows={2} placeholder="وصف مختصر للمجموعة…" />
          </label>
        </form>
      </Modal>

      <Modal
        open={memberGroup !== null}
        title="إضافة عضو"
        subtitle={memberGroup?.name}
        onClose={() => setMemberGroup(null)}
        footer={
          <>
            <button type="button" className="btn ghost" onClick={() => setMemberGroup(null)}>
              إلغاء
            </button>
            <button type="submit" form="add-member" className="btn" disabled={busy}>
              إضافة
            </button>
          </>
        }
      >
        {memberError ? <div className="form-error">{memberError}</div> : null}
        <form id="add-member" className="grid" style={{ gap: 12 }} onSubmit={handleAddMember}>
          <label className="field">
            المعتمر
            <select
              className="select"
              required
              value={memberPilgrimId}
              onChange={(event) => setMemberPilgrimId(event.target.value)}
            >
              <option value="">— اختر معتمراً —</option>
              {pilgrims
                .filter(
                  (pilgrim) =>
                    !memberGroup?.members.some((member) => member.pilgrimId === pilgrim.id),
                )
                .map((pilgrim) => (
                  <option key={pilgrim.id} value={pilgrim.id}>
                    {pilgrim.fullNameAr} — {pilgrim.passportNumber}
                  </option>
                ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={isLeader} onChange={(event) => setIsLeader(event.target.checked)} />
            تعيينه قائداً للمجموعة
          </label>
        </form>
      </Modal>
    </>
  );
}
