import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usersApi, notificationsApi, devicesApi, rulesApi } from '../services/api';
import Modal from '../components/Modal';
import { 
  ShieldIcon, 
  UserIcon, 
  TrashIcon, 
  EditIcon, 
  PlusIcon, 
  ActivityIcon,
  CheckIcon
} from '../components/Icons';

export default function AdminPage({ onNavigate }) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [usersList, setUsersList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [totalDevicesCount, setTotalDevicesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Kullanıcı Ekleme / Düzenleme Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState('user');

  // Silme State
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);

  // Yetki Kontrolü: Admin değilse engelle ve uyar
  useEffect(() => {
    if (!isAdmin) {
      toast.error('Yetkisiz Erişim! Admin paneline yalnızca yöneticiler erişebilir.', 'Erişim Engellendi');
      onNavigate('/dashboard');
    }
  }, [isAdmin, onNavigate, toast]);

  // Verileri yükle
  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const [allUsers, allLogs, allDevs] = await Promise.all([
        usersApi.getAll(),
        notificationsApi.getAll(),
        devicesApi.getAll()
      ]);
      setUsersList(allUsers || []);
      setLogsList(allLogs || []);
      setTotalDevicesCount(allDevs?.length || 0);
    } catch (err) {
      console.warn('Admin verileri çekilemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Kullanıcı Ekleme / Düzenleme Modal Aç
  const handleOpenUserModal = (targetUser = null) => {
    if (targetUser) {
      setEditingUser(targetUser);
      setUsernameInput(targetUser.username);
      setPasswordInput(targetUser.password);
      setRoleInput(targetUser.role);
    } else {
      setEditingUser(null);
      setUsernameInput('');
      setPasswordInput('');
      setRoleInput('user');
    }
    setIsUserModalOpen(true);
  };

  // Kullanıcı Kaydet (CREATE / UPDATE - CRUD)
  const handleSaveUser = async (e) => {
    e.preventDefault();

    if (!usernameInput.trim() || !passwordInput.trim()) {
      toast.warning('Kullanıcı adı ve şifre alanları boş bırakılamaz.', 'Eksik Alan');
      return;
    }

    try {
      if (editingUser) {
        // GÜNCELLEME (UPDATE)
        const updated = await usersApi.update(editingUser.id, {
          username: usernameInput.trim(),
          password: passwordInput.trim(),
          role: roleInput
        });

        setUsersList((prev) => prev.map((u) => (u.id === editingUser.id ? updated : u)));
        toast.success(`"${usernameInput}" kullanıcısı güncellendi.`, 'Kullanıcı Güncellendi');

        await notificationsApi.create({
          userId: user.id,
          message: `Admin, ${usernameInput} kullanıcısının bilgilerini/rolünü güncelledi.`,
          timestamp: new Date().toISOString()
        });
      } else {
        // EKLEME (CREATE)
        const existing = await usersApi.getByUsername(usernameInput.trim());
        if (existing && existing.length > 0) {
          toast.warning('Bu kullanıcı adı zaten sistemde mevcut!', 'Uyarı');
          return;
        }

        const created = await usersApi.create({
          username: usernameInput.trim(),
          password: passwordInput.trim(),
          role: roleInput
        });

        setUsersList((prev) => [...prev, created]);
        toast.success(`"${usernameInput}" kullanıcısı oluşturuldu!`, 'Yeni Kullanıcı');

        await notificationsApi.create({
          userId: user.id,
          message: `Admin yeni bir kullanıcı ekledi: ${usernameInput} (${roleInput})`,
          timestamp: new Date().toISOString()
        });
      }

      setIsUserModalOpen(false);
      loadAdminData();
    } catch (err) {
      toast.error('Kullanıcı işlemi başarısız: ' + err.message);
    }
  };

  // Kullanıcı Rolünü Hızlı Değiştir (Tek Tıkla Role Update)
  const handleToggleRole = async (targetUser) => {
    if (targetUser.id === user.id) {
      toast.warning('Kendi yönetici rolünüzü kaldıramazsınız!', 'İşlem Engellendi');
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const updated = await usersApi.update(targetUser.id, { role: newRole });
      setUsersList((prev) => prev.map((u) => (u.id === targetUser.id ? updated : u)));
      toast.success(`${targetUser.username} kullanıcısının yeni rolü: ${newRole.toUpperCase()}`);

      await notificationsApi.create({
        userId: user.id,
        message: `${targetUser.username} kullanıcısının rolü "${newRole}" olarak değiştirildi.`,
        timestamp: new Date().toISOString()
      });
    } catch {
      toast.error('Rol güncellenemedi.');
    }
  };

  // Kullanıcı Sil (DELETE - CRUD)
  const handleConfirmDeleteUser = async () => {
    if (!deleteTargetUser) return;

    if (deleteTargetUser.id === user.id) {
      toast.error('Kendinizi silemezsiniz!', 'İşlem Reddedildi');
      setDeleteTargetUser(null);
      return;
    }

    try {
      await usersApi.delete(deleteTargetUser.id);
      setUsersList((prev) => prev.filter((u) => u.id !== deleteTargetUser.id));
      toast.success(`"${deleteTargetUser.username}" kullanıcısı sistemden silindi.`, 'Kullanıcı Silindi');

      await notificationsApi.create({
        userId: user.id,
        message: `Admin, ${deleteTargetUser.username} kullanıcısını sistemden sildi.`,
        timestamp: new Date().toISOString()
      });

      setDeleteTargetUser(null);
      loadAdminData();
    } catch (err) {
      toast.error('Kullanıcı silinemedi: ' + err.message);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      {/* Sayfa Başlığı */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Yönetici Kontrol Merkezi (Admin)</h1>
          <p>Sistemdeki tüm kayıtlı kullanıcıları yönetin ve otomasyon log geçmişini inceleyin.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => handleOpenUserModal()}
        >
          <PlusIcon size={18} />
          <span>Yeni Kullanıcı Ekle</span>
        </button>
      </div>

      {/* İstatistikler */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <UserIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{usersList.length}</h3>
            <p>Toplam Kayıtlı Kullanıcı</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon cyan">
            <ShieldIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{usersList.filter((u) => u.role === 'admin').length}</h3>
            <p>Yönetici (Admin) Sayısı</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon emerald">
            <ActivityIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{totalDevicesCount}</h3>
            <p>Sistemdeki Toplam Cihaz</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <ActivityIcon size={24} />
          </div>
          <div className="stat-info">
            <h3>{logsList.length}</h3>
            <p>Toplam Sistem Logu</p>
          </div>
        </div>
      </div>

      {/* Kullanıcı Yönetimi & Sistem Logları Izgarası */}
      <div className="admin-grid-layout">
        {/* Kullanıcı Listesi Tablosu (USER CRUD) */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Kayıtlı Kullanıcılar (Kullanıcı CRUD)</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{usersList.length} kullanıcı listelendi</span>
          </div>

          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Kullanıcı Adı</th>
                  <th>Şifre</th>
                  <th>Yetki / Rol</th>
                  <th style={{ textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{u.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <div className="user-avatar-circle" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                        {u.id === user.id && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>(Sen)</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                      ••••••
                    </td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === 'admin' ? 'YÖNETİCİ' : 'STANDART'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                          onClick={() => handleToggleRole(u)}
                          title="Rolünü Değiştir"
                          disabled={u.id === user.id}
                        >
                          Rol Değiştir
                        </button>
                        <button
                          type="button"
                          className="action-btn-sm"
                          onClick={() => handleOpenUserModal(u)}
                          title="Kullanıcıyı Düzenle"
                        >
                          <EditIcon size={15} />
                        </button>
                        <button
                          type="button"
                          className="action-btn-sm delete"
                          onClick={() => setDeleteTargetUser(u)}
                          title="Kullanıcıyı Sil"
                          disabled={u.id === user.id}
                        >
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sistem Etkinlik Logları */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ActivityIcon size={20} className="stat-icon-cyan" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Sistem ve Otomasyon Geçmişi (Loglar)</h3>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gerçek Zamanlı Kayıtlar</span>
          </div>

          <div className="logs-list">
            {logsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                Henüz sistem etkinliği kaydedilmedi.
              </div>
            ) : (
              logsList.map((log) => (
                <div key={log.id} className="log-item">
                  <div className="log-message-box">
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }} />
                    <span style={{ fontWeight: 500 }}>{log.message}</span>
                  </div>
                  <div className="log-timestamp">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('tr-TR') : 'Bilinmiyor'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Kullanıcı Ekleme / Düzenleme Modalı */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsUserModalOpen(false)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveUser}
            >
              {editingUser ? 'Güncelle' : 'Kullanıcıyı Oluştur'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="user-username-input">Kullanıcı Adı</label>
            <input
              id="user-username-input"
              type="text"
              className="form-input"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Kullanıcı adı giriniz"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-password-input">Şifre</label>
            <input
              id="user-password-input"
              type="text"
              className="form-input"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Şifre giriniz"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="user-role-select">Yetki / Rol</label>
            <select
              id="user-role-select"
              className="form-select"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
            >
              <option value="user">Standart Kullanıcı (user)</option>
              <option value="admin">Sistem Yöneticisi (admin)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Kullanıcı Silme Onay Modalı */}
      <Modal
        isOpen={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        title="Kullanıcı Silme Onayı"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteTargetUser(null)}
            >
              İptal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmDeleteUser}
            >
              Kullanıcıyı Sil
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-muted)' }}>
          <strong>"{deleteTargetUser?.username}"</strong> adlı kullanıcıyı kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz.
        </p>
      </Modal>
    </div>
  );
}
