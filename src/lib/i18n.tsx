import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ru' | 'uz';

interface Translations {
  [key: string]: string;
}

const translations: Record<Language, Translations> = {
  en: {
    app_title: 'Crane IoT',
    sign_in_subtitle: 'Sign in to access your devices',
    continue_google: 'Continue with Google',
    dashboard: 'Dashboard',
    devices: 'Devices',
    schedules: 'Schedules',
    profile: 'Profile',
    total_devices: 'Total Devices',
    online: 'Online',
    open_valves: 'Open Valves',
    pending_schedules: 'Pending Schedules',
    quick_access: 'Quick Access',
    recent_activity: 'Recent Activity',
    recent_activity_subtitle: 'System events and command logs',
    initiated_by: 'Initiated by',
    current_status: 'Current Status',
    last_seen: 'Last seen:',
    add_device: 'Add Device',
    no_devices: 'No Devices Found',
    no_devices_desc: 'Click "Add Device" to claim your first pipe crane using its serial code.',
    claim_new_device: 'Claim New Device',
    claim_desc: 'Enter the serial claim code printed on your physical crane unit.',
    cancel: 'Cancel',
    claim_device: 'Claim Device',
    claiming: 'Claiming...',
    back: 'Back',
    specifications: 'Specifications',
    owner: 'Owner',
    my_access: 'My Access',
    create_schedule: 'Create Schedule',
    action: 'Action',
    open: 'Open',
    close: 'Close',
    date: 'Date',
    time: 'Time',
    save_schedule: 'Save Schedule',
    device_sharing: 'Device Sharing',
    invite_email: 'Invite via Email',
    add: 'Add',
    people_access: 'People with access',
    remove: 'Remove',
    shared: 'Shared',
    not_shared: 'Not shared with anyone yet.',
    all_schedules: 'All Schedules',
    schedules_subtitle: 'Upcoming and past automated commands across your devices',
    no_schedules: 'No schedules found.',
    created_by: 'Created by',
    joined_platform: 'Joined Platform',
    owned: 'Owned',
    account_security: 'Account Security',
    auth_google: 'Authenticated via Google',
    sign_out: 'Sign Out',
    select_language: 'Select Language',
    continue: 'Continue',
    no_recent_activity: 'No recent activity.',
    tap_to_command: 'Tap to send real-time MQTT command over cellular network.',
    only_owner_can_invite: 'Only the owner can invite other users.',
    theme: 'Theme',
    light_mode: 'Light',
    dark_mode: 'Dark',
    language_settings: 'Language Settings',
  },
  ru: {
    app_title: 'Crane IoT',
    sign_in_subtitle: 'Войдите, чтобы получить доступ к вашим устройствам',
    continue_google: 'Продолжить с Google',
    dashboard: 'Главная',
    devices: 'Устройства',
    schedules: 'Расписание',
    profile: 'Профиль',
    total_devices: 'Всего устройств',
    online: 'В сети',
    open_valves: 'Открытые краны',
    pending_schedules: 'Ожидающие расписания',
    quick_access: 'Быстрый доступ',
    recent_activity: 'Последняя активность',
    recent_activity_subtitle: 'Системные события и логи команд',
    initiated_by: 'Инициировано',
    current_status: 'Текущий статус',
    last_seen: 'В сети:',
    add_device: 'Добавить устройство',
    no_devices: 'Устройства не найдены',
    no_devices_desc: 'Нажмите «Добавить устройство», чтобы зарегистрировать ваш первый кран по серийному коду.',
    claim_new_device: 'Регистрация устройства',
    claim_desc: 'Введите серийный код, указанный на вашем физическом устройстве.',
    cancel: 'Отмена',
    claim_device: 'Добавить',
    claiming: 'Добавление...',
    back: 'Назад',
    specifications: 'Характеристики',
    owner: 'Владелец',
    my_access: 'Мой доступ',
    create_schedule: 'Создать расписание',
    action: 'Действие',
    open: 'Открыть',
    close: 'Закрыть',
    date: 'Дата',
    time: 'Время',
    save_schedule: 'Сохранить',
    device_sharing: 'Общий доступ',
    invite_email: 'Пригласить по Email',
    add: 'Добавить',
    people_access: 'Пользователи с доступом',
    remove: 'Удалить',
    shared: 'Доступно',
    not_shared: 'Пока нет общего доступа.',
    all_schedules: 'Все расписания',
    schedules_subtitle: 'Предстоящие и прошлые автоматические команды',
    no_schedules: 'Расписания не найдены.',
    created_by: 'Создано',
    joined_platform: 'На платформе с',
    owned: 'Собственные',
    account_security: 'Безопасность аккаунта',
    auth_google: 'Авторизовано через Google',
    sign_out: 'Выйти',
    select_language: 'Выберите язык',
    continue: 'Продолжить',
    no_recent_activity: 'Нет недавней активности.',
    tap_to_command: 'Нажмите для отправки команды по сотовой сети.',
    only_owner_can_invite: 'Только владелец может приглашать пользователей.',
    theme: 'Тема',
    light_mode: 'Светлая',
    dark_mode: 'Темная',
    language_settings: 'Настройки языка',
  },
  uz: {
    app_title: 'Crane IoT',
    sign_in_subtitle: 'Qurilmalaringizga kirish uchun tizimga kiring',
    continue_google: 'Google bilan davom etish',
    dashboard: 'Asosiy',
    devices: 'Qurilmalar',
    schedules: 'Jadvallar',
    profile: 'Profil',
    total_devices: 'Jami qurilmalar',
    online: 'Onlayn',
    open_valves: 'Ochiq kranlar',
    pending_schedules: 'Kutilayotgan jadvallar',
    quick_access: 'Tezkor kirish',
    recent_activity: 'So\'nggi faollik',
    recent_activity_subtitle: 'Tizim hodisalari va buyruqlar tarixi',
    initiated_by: 'Tomonidan boshlangan',
    current_status: 'Joriy holat',
    last_seen: 'So\'nggi marta:',
    add_device: 'Qurilma qo\'shish',
    no_devices: 'Qurilmalar topilmadi',
    no_devices_desc: 'Birinchi kraningizni seriya kodi yordamida ro\'yxatdan o\'tkazish uchun "Qurilma qo\'shish" tugmasini bosing.',
    claim_new_device: 'Yangi qurilmani ro\'yxatdan o\'tkazish',
    claim_desc: 'Qurilmangizda ko\'rsatilgan seriya kodini kiriting.',
    cancel: 'Bekor qilish',
    claim_device: 'Qo\'shish',
    claiming: 'Qo\'shilmoqda...',
    back: 'Orqaga',
    specifications: 'Xususiyatlar',
    owner: 'Egasi',
    my_access: 'Mening ruxsatim',
    create_schedule: 'Jadval yaratish',
    action: 'Harakat',
    open: 'Ochish',
    close: 'Yopish',
    date: 'Sana',
    time: 'Vaqt',
    save_schedule: 'Saqlash',
    device_sharing: 'Ruxsat berish',
    invite_email: 'Email orqali taklif qilish',
    add: 'Qo\'shish',
    people_access: 'Ruxsati bor foydalanuvchilar',
    remove: 'O\'chirish',
    shared: 'Ulashilgan',
    not_shared: 'Hozircha hech kim bilan ulashilmagan.',
    all_schedules: 'Barcha jadvallar',
    schedules_subtitle: 'Qurilmalar bo\'yicha kutilayotgan va o\'tgan avtomatik buyruqlar',
    no_schedules: 'Jadvallar topilmadi.',
    created_by: 'Yaratgan',
    joined_platform: 'Platformaga qo\'shilgan',
    owned: 'Shaxsiy',
    account_security: 'Hisob xavfsizligi',
    auth_google: 'Google orqali tasdiqlangan',
    sign_out: 'Chiqish',
    select_language: 'Tilni tanlang',
    continue: 'Davom etish',
    no_recent_activity: 'So\'nggi faollik yo\'q.',
    tap_to_command: 'Uyali aloqa tarmog\'i orqali buyruq yuborish uchun bosing.',
    only_owner_can_invite: 'Faqat egasi boshqalarni taklif qilishi mumkin.',
    theme: 'Mavzu',
    light_mode: 'Yorug\'',
    dark_mode: 'Qorong\'i',
    language_settings: 'Til sozlamalari',
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && ['en', 'ru', 'uz'].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('app_language', lang);
    setLanguageState(lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
