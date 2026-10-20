import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { rulesApi, devicesApi, notificationsApi } from '../services/api';
import { 
  executeRule, 
  onAutomationDeviceUpdate, 
  getCurrentTimeString 
} from '../services/automationEngine';
import Modal from '../components/Modal';
import { 
  PlusIcon, 
  ClockIcon, 
  TrashIcon, 
  SlidersIcon, 
  PowerIcon 
} from '../components/Icons';

export default function RulesPage({ onNavigate: _onNavigate }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => getCurrentTimeString());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [conditionTime, setConditionTime] = useState('19:00');
  const [selectedAction, setSelectedAction] = useState('turn_on');

  // Silme State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Verileri çek
  const userId = user?.id;
  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [userRules, userDevices] = await Promise.all([
        rulesApi.getByUser(userId),
        devicesApi.getByUser(userId)
      ]);
      setRules(userRules || []);
      setDevices(userDevices || []);
      if (userDevices && userDevices.length > 0) {
        setSelectedDeviceId(String(userDevices[0].id));
      }
    } catch (err) {
      console.warn('Kurallar sunucudan çekilemedi:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Canlı saat göstergesi
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Otomasyon motorundan gelen anlık cihaz güncellemelerini yakala
  useEffect(() => {
    const unsubscribe = onAutomationDeviceUpdate((updatedDev) => {
      setDevices((prev) =>
        prev.map((d) => (d.id === updatedDev.id ? { ...d, ...updatedDev } : d))
      );
    });
    return unsubscribe;
  }, []);

  // Yeni Kural Ekle (CREATE - CRUD)
  const handleCreateRule = async (e) => {
    e.preventDefault();

    if (!selectedDeviceId) {
      toast.warning('Lütfen kuralın uygulanacağı cihazı seçiniz.', 'Eksik Cihaz');
      return;
    }

    if (!conditionTime) {
      toast.warning('Lütfen bir tetikleme saati belirleyiniz.', 'Eksik Zaman');
      return;
    }

    try {
      const targetDev = devices.find((d) => String(d.id) === String(selectedDeviceId));
      const targetDevName = targetDev ? targetDev.name : 'Cihaz';

      const newRuleData = {
        userId: user.id,
        deviceId: Number(selectedDeviceId),
        condition: conditionTime,
        action: selectedAction
      };

      const created = await rulesApi.create(newRuleData);
      setRules((prev) => [...prev, created]);

      const actionText = selectedAction === 'turn_on' ? 'Açılması' : 'Kapatılması';
      toast.success(
        `Saat ${conditionTime} olduğunda "${targetDevName}" cihazının ${actionText} kuralı oluşturuldu.`,
        'Otomasyon Kuralı Eklendi'
      );

      await notificationsApi.create({
        userId: user.id,
        message: `Yeni otomasyon kuralı eklendi: Saat ${conditionTime} -> ${targetDevName} (${selectedAction})`,
        timestamp: new Date().toISOString()
      });

      setIsModalOpen(false);
    } catch (err) {
      toast.error('Kural eklenirken hata: ' + err.message);
    }
  };

  // Kuralı Sil (DELETE - CRUD)
  const handleDeleteRule = async () => {
    if (!deleteTarget) return;

    try {
      await rulesApi.delete(deleteTarget.id);
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Otomasyon kuralı başarıyla silindi.', 'Kural Silindi');

      await notificationsApi.create({
        userId: user.id,
        message: `Otomasyon kuralı silindi (ID: ${deleteTarget.id})`,
        timestamp: new Date().toISOString()
      });

      setDeleteTarget(null);
    } catch (err) {
      toast.error('Kural silinirken hata: ' + err.message);
    }
  };

  // Kuralı Anında Simüle Et / Tetikle (Ortak executeRule servisi ile)
  const handleTriggerRuleNow = async (rule) => {
    const result = await executeRule(rule, {
      user,
      devices,
      toast,
      isManual: true
    });

    if (result && result.success && result.device) {
      setDevices((prev) =>
        prev.map((d) => (d.id === result.device.id ? result.device : d))
      );
    }
  };

  return (
    <div>
      {/* Sayfa Başlığı */}
      <div className="page-header">
        <div className="page-title-group">
          <h1>Otomasyon & Senaryolar</h1>
          <p>Belirli saat ve koşullara göre cihazlarınızın otomatik çalışmasını sağlayın.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            if (devices.length === 0) {
              toast.warning('Kural eklemeden önce en az bir cihaz eklemelisiniz!', 'Cihaz Bulunamadı');
              return;
            }
            setIsModalOpen(true);
          }}
        >
          <PlusIcon size={18} />
          <span>Yeni Kural Oluştur</span>
        </button>
      </div>

      {/* Otomasyon Motoru Canlı Durum Çubuğu */}
      <div className="automation-engine-status-bar">
        <div className="engine-status-left">
          <span className="engine-pulse-dot" />
          <div className="engine-status-text">
            <strong>Otomasyon Motoru: Aktif (Tarayıcı İçi İzleme)</strong>
            <p>
              Kurallar sistem saatine göre her 10 saniyede bir taranır. Tarayıcı sekmesi açıkken otomatik çalışır.
            </p>
          </div>
        </div>
        <div className="engine-status-right">
          <span className="engine-clock-badge">
            <ClockIcon size={14} />
            <span>Sistem Saati: {currentTime}</span>
          </span>
        </div>
      </div>

      {/* Kurallar Listesi */}
      {loading ? (
        <div className="spinner" />
      ) : rules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <SlidersIcon size={32} />
          </div>
          <h3>Henüz Tanımlı Kural Yok</h3>
          <p>
            Akıllı evinizi otomatik pilot moduna geçirin. Örneğin; "Saat 19:00 olduğunda Salon Lambası açılsın" gibi bir kural tanımlayın.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (devices.length === 0) {
                toast.warning('Önce bir cihaz eklemelisiniz.');
                return;
              }
              setIsModalOpen(true);
            }}
          >
            <PlusIcon size={18} />
            <span>Kural Oluştur</span>
          </button>
        </div>
      ) : (
        <div className="rules-list">
          {rules.map((rule) => {
            const targetDev = devices.find((d) => d.id === rule.deviceId);
            const devName = targetDev ? targetDev.name : `Cihaz #${rule.deviceId}`;
            const isTurnOn = rule.action === 'turn_on';

            return (
              <div key={rule.id} className="rule-item-card">
                <div className="rule-main-content">
                  <div className="rule-time-badge">
                    <ClockIcon size={18} />
                    <span>{rule.condition}</span>
                  </div>

                  <div className="rule-description">
                    <div className="rule-title-text">
                      Saat {rule.condition} olduğunda {devName} otomatik{' '}
                      <span className={`action-pill ${isTurnOn ? 'turn_on' : 'turn_off'}`}>
                        {isTurnOn ? 'Aç' : 'Kapat'}
                      </span>
                    </div>
                    <div className="rule-target-device">
                      Hedef Cihaz: {devName} | Durum: {targetDev?.status ? 'Şu an Açık' : 'Şu an Kapalı'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Test / Simülasyon Butonu */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '7px 12px' }}
                    onClick={() => handleTriggerRuleNow(rule)}
                    title="Bu kuralı şimdi test et ve cihaz durumunu değiştir"
                  >
                    <PowerIcon size={14} />
                    <span>Şimdi Çalıştır</span>
                  </button>

                  <button
                    type="button"
                    className="action-btn-sm delete"
                    onClick={() => setDeleteTarget(rule)}
                    title="Kuralı Sil"
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kural Oluşturma Modalı */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Yeni Otomasyon Kuralı Oluştur"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Vazgeç
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateRule}
            >
              Kuralı Kaydet
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="rule-device-select">Hedef Akıllı Cihaz</label>
            <select
              id="rule-device-select"
              className="form-select"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rule-time-input">Tetiklenme Saati (Zaman Koşulu)</label>
            <input
              id="rule-time-input"
              type="time"
              className="form-input"
              value={conditionTime}
              onChange={(e) => setConditionTime(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rule-action-select">Gerçekleştirilecek Eylem</label>
            <select
              id="rule-action-select"
              className="form-select"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
            >
              <option value="turn_on">Cihazı Aç (turn_on)</option>
              <option value="turn_off">Cihazı Kapat (turn_off)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Kural Silme Modalı */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Kuralı Silmek İstiyor Musunuz?"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteTarget(null)}
            >
              İptal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteRule}
            >
              Kuralı Sil
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-muted)' }}>
          Bu otomasyon kuralı kaldırılacaktır. Devam etmek istiyor musunuz?
        </p>
      </Modal>
    </div>
  );
}
