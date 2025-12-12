'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define the languages we'll support
type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  en: {
    adminDashboard: 'Admin Dashboard',
    logout: 'Logout',
    totalUsers: 'Total Users',
    totalListings: 'Total Listings',
    totalBookings: 'Total Bookings',
    totalRevenue: 'Total Revenue',
    overview: 'Overview',
    users: 'Users',
    bookings: 'Bookings',
    units: 'Units',
    platformOverview: 'Platform Overview',
    activeListings: 'Active Listings',
    pendingBookings: 'Pending Bookings',
    platformRevenue: 'Platform Revenue',
    totalUnits: 'Total Units',
    unitsOutOfService: 'Units Out of Service',
    availableUnits: 'Available Units',
    unitsNoAccess: 'Units No Access',
    upcomingDepartures: 'Upcoming Departures',
    unitsList: 'Units List',
    unitName: 'Unit Name',
    status: 'Status',
    availability: 'Availability',
    location: 'Location',
    actions: 'Actions',
    available: 'Available',
    notAvailable: 'Not Available',
    noAccess: 'No Access',
    unknown: 'Unknown',
    viewDetails: 'View Details',
    noUnitsYet: 'No units yet',
    active: 'Active',
    inactive: 'Inactive',
    noUsersYet: 'No users yet',
    host: 'Host',
    guest: 'Guest',
    recentBookings: 'Recent Bookings',
    noBookingsYet: 'No bookings yet',
    confirmed: 'Confirmed',
    pending: 'Pending',
    loading: 'Loading',
    stays: 'Stays',
    experiences: 'Experiences',
    onlineExperiences: 'Online Experiences',
    packagesOffers: 'Packages & Offers',
    dashboard: 'Dashboard',
    login: 'Login',
    signUp: 'Sign up',
    findYourNextStay: 'Find your next stay',
    explorePropertiesWorld: 'Explore amazing properties around the world',
    exploreKSA: 'Explore Saudi Arabia',
    discoverDestinations: 'Discover amazing destinations across the kingdom',
    properties: 'properties',
    popularStays: 'Popular Stays',
    highlyRatedProperties: 'Highly-rated properties loved by guests',
    loadingListings: 'Loading listings',
    noListingsYet: 'No listings available yet',
    noImage: 'No image',
    new: 'New',
    perNight: '/ night',
    upgradeToPremium: 'Upgrade to Premium',
    welcomeToPMS: 'Welcome to PMS Dashboard',
    upgradeRequired: 'Upgrade Required',
    upgradeToAccessDashboard: 'You need to upgrade to a premium plan to access the dashboard',
    profile: 'Profile',
    fullName: 'Full Name',
    email: 'Email',
    bio: 'Bio',
    phone: 'Phone',
    city: 'City',
    country: 'Country',
    address: 'Address',
    enterFullName: 'Enter full name',
    enterBio: 'Enter bio',
    enterPhone: 'Enter phone',
    enterCity: 'Enter city',
    enterCountry: 'Enter country',
    enterAddress: 'Enter address',
    premiumUser: 'Premium User',
    standardUser: 'Standard User',
    changePicture: 'Change Picture',
    updating: 'Updating...',
    updateProfile: 'Update Profile',
    uploading: 'Uploading',
    imageFileTypeError: 'Please select an image file',
    imageFileSizeError: 'File size exceeds 5MB limit',
    uploadError: 'Upload failed, please try again',
    updateError: 'Update failed, please try again',
    profileUpdatedSuccessfully: 'Profile updated successfully!',
    profileUpdatedDescription: 'Your profile information has been updated.',
    profileCreatedSuccessfully: 'Profile created successfully!',
    profileCreatedDescription: 'Your profile has been created.',
    profileUpdateFailed: 'Profile update failed',
    profileUpdateError: 'An error occurred while updating your profile.',
    profileNotFoundError: 'Profile not found. Please log out and log back in to create your profile.',
    selectCity: 'Select City',
    selectCityPlaceholder: 'Choose a city',
    riyadh: 'Riyadh',
    jeddah: 'Jeddah',
    dammam: 'Dammam',
    abha: 'Abha',
    alKhobar: 'Al Khobar',
    madinah: 'Madinah',
    capitalCity: 'Capital city',
    redSeaCoastalCity: 'Red Sea coastal city',
    easternProvince: 'Eastern Province',
    mountainCity: 'Mountain city',
    businessHub: 'Business hub',
    holyCity: 'Holy city',
    unitsInCity: 'Units in this city',
    addUnit: 'Add Unit',
    unitAddedSuccessfully: 'Unit added successfully',
    unitUpdatedSuccessfully: 'Unit updated successfully',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    systemMode: 'System Mode',
    currentTheme: 'Current Theme',
    ownerStatements: 'Owner Statements',
    paymentTracking: 'Payment Tracking',
    expenses: 'Expenses',
    welcomeBack: 'Welcome Back',
    enterYourCredentialsToAccessYourAccount: 'Enter your credentials to access your account',
    signingIn: 'Signing in...',
    signIn: 'Sign In',
    dontHaveAnAccount: "Don't have an account?",
    propertyManagementSystem: 'Property Management System',
    loginFailed: 'Login failed',
    anErrorOccurredPleaseTryAgain: 'An error occurred. Please try again.',
    passwordsDoNotMatch: 'Passwords do not match',
    registrationFailed: 'Registration failed',
    createAnAccount: 'Create an Account',
    enterYourDetailsToGetStarted: 'Enter your details to get started',
    confirmPassword: 'Confirm Password',
    creatingAccount: 'Creating account...',
    createAccount: 'Create Account',
    alreadyHaveAnAccount: 'Already have an account?',
    propertySettings: 'Property Settings',
    supportTitle: 'Support',
    supportSubtitle: 'We\'re here to help you 24/7. Contact us through any of the methods below',
    contactInfo: 'Contact Information',
    available247: 'Available 24/7',
    whatsappDescription: 'Chat with us on WhatsApp for quick support and assistance',
    contactViaWhatsApp: 'Contact via WhatsApp',
    emailDescription: 'Send us an email and we\'ll respond as soon as possible',
    sendEmail: 'Send Email',
    adminContact: 'Admin Contact Information',
    backToHome: 'Back to Home',
  },
  ar: {
    adminDashboard: 'لوحة تحكم المشرف',
    logout: 'تسجيل الخروج',
    totalUsers: 'إجمالي المستخدمين',
    totalListings: 'إجمالي القوائم',
    totalBookings: 'إجمالي الحجوزات',
    totalRevenue: 'إجمالي الإيرادات',
    overview: 'نظرة عامة',
    users: 'المستخدمون',
    bookings: 'الحجوزات',
    units: 'الوحدات',
    platformOverview: 'نظرة عامة على النظام',
    activeListings: 'القوائم النشطة',
    pendingBookings: 'الحجوزات المعلقة',
    platformRevenue: 'إيرادات النظام',
    totalUnits: 'إجمالي الوحدات',
    unitsOutOfService: 'الوحدات المعطلة',
    availableUnits: 'الوحدات المتوفرة',
    unitsNoAccess: 'الوحدات بلا وصول',
    upcomingDepartures: 'المغادرات القادمة',
    unitsList: 'قائمة الوحدات',
    unitName: 'اسم الوحدة',
    status: 'الحالة',
    availability: 'التوفر',
    location: 'الموقع',
    actions: 'الإجراءات',
    available: 'متوفر',
    notAvailable: 'غير متوفر',
    noAccess: 'لا يوجد وصول',
    unknown: 'غير معروف',
    viewDetails: 'عرض التفاصيل',
    noUnitsYet: 'لا توجد وحدات بعد',
    active: 'نشط',
    inactive: 'غير نشط',
    noUsersYet: 'لا يوجد مستخدمون بعد',
    host: 'مضيف',
    guest: 'ضيف',
    recentBookings: 'الحجوزات الأخيرة',
    noBookingsYet: 'لا توجد حجوزات بعد',
    confirmed: 'مؤكد',
    pending: 'معلق',
    loading: 'جاري التحميل',
    stays: 'الإقامات',
    experiences: 'التجارب',
    onlineExperiences: 'التجارب عبر الإنترنت',
    packagesOffers: 'الحزم والعروض',
    dashboard: 'لوحة التحكم',
    login: 'تسجيل الدخول',
    signUp: 'التسجيل',
    findYourNextStay: 'ابحث عن إقامتك التالية',
    explorePropertiesWorld: 'استكشف خيارات الإقامة المذهلة في جميع أنحاء العالم',
    exploreKSA: 'استكشف المملكة العربية السعودية',
    discoverDestinations: 'اكتشف وجهات مذهلة عبر المملكة',
    properties: 'الخصائص',
    popularStays: 'الإقامات الشهيرة',
    highlyRatedProperties: 'الخصائص ذات التقييم العالي والمفضلة لدى الضيوف',
    loadingListings: 'جاري تحميل القوائم',
    noListingsYet: 'لا توجد قوائم متاحة بعد',
    noImage: 'لا توجد صورة',
    new: 'جديد',
    perNight: '/ ليلة',
    upgradeToPremium: 'الترقية إلى النسخة المميزة',
    welcomeToPMS: 'مرحبا بك في لوحة تحكم PMS',
    upgradeRequired: 'الترقية مطلوبة',
    upgradeToAccessDashboard: 'تحتاج إلى الترقية إلى خطة مميزة للوصول إلى لوحة التحكم',
    profile: 'الملف الشخصي',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    bio: 'السيرة الذاتية',
    phone: 'الهاتف',
    city: 'المدينة',
    country: 'الدولة',
    address: 'العنوان',
    enterFullName: 'أدخل الاسم الكامل',
    enterBio: 'أدخل السيرة الذاتية',
    enterPhone: 'أدخل الهاتف',
    enterCity: 'أدخل المدينة',
    enterCountry: 'أدخل الدولة',
    enterAddress: 'أدخل العنوان',
    premiumUser: 'مستخدم مميز',
    standardUser: 'مستخدم عادي',
    changePicture: 'تغيير الصورة',
    updating: 'جاري التحديث...',
    updateProfile: 'تحديث الملف الشخصي',
    uploading: 'جاري التحميل',
    imageFileTypeError: 'الرجاء اختيار ملف صورة',
    imageFileSizeError: 'حجم الملف يتجاوز الحد المسموح (5 ميغابايت)',
    uploadError: 'فشل التحميل، يرجى المحاولة مرة أخرى',
    updateError: 'فشل التحديث، يرجى المحاولة مرة أخرى',
    profileUpdatedSuccessfully: 'تم تحديث الملف الشخصي بنجاح!',
    profileUpdatedDescription: 'تم تحديث معلومات ملفك الشخصي.',
    profileCreatedSuccessfully: 'تم إنشاء الملف الشخصي بنجاح!',
    profileCreatedDescription: 'تم إنشاء ملفك الشخصي.',
    profileUpdateFailed: 'فشل تحديث الملف الشخصي',
    profileUpdateError: 'حدث خطأ أثناء تحديث ملفك الشخصي.',
    profileNotFoundError: 'الملف الشخصي غير موجود. يرجى تسجيل الخروج ثم تسجيل الدخول مجددًا لإنشاء ملفك الشخصي.',
    selectCity: 'اختر المدينة',
    selectCityPlaceholder: 'اختر مدينة',
    riyadh: 'الرياض',
    jeddah: 'جدة',
    dammam: 'الدمام',
    abha: 'أبها',
    alKhobar: 'الخبر',
    madinah: 'المدينة المنورة',
    capitalCity: 'مدينة عاصمة',
    redSeaCoastalCity: 'مدينة ساحلية على البحر الأحمر',
    easternProvince: 'المنطقة الشرقية',
    mountainCity: 'مدينة جبلية',
    businessHub: 'مركز تجاري',
    holyCity: 'مدينة مقدسة',
    unitsInCity: 'الوحدات في هذه المدينة',
    addUnit: 'إضافة وحدة',
    unitAddedSuccessfully: 'تم إضافة الوحدة بنجاح',
    unitUpdatedSuccessfully: 'تم تحديث الوحدة بنجاح',
    darkMode: 'الوضع المظلم',
    lightMode: 'الوضع الفاتح',
    systemMode: 'وضع النظام',
    occupancy: 'الإشغال',
    reservations: 'الحجوزات',
    guests: 'الضيوف',
    messages: 'الرسائل',
    channels: 'القنوات',
    smartLocks: 'الأقفال الذكية',
    tasks: 'المهام',
    invoices: 'الفواتير',
    receipts: 'الإيصالات',
    reports: 'التقارير',
    paymentLinks: 'روابط الدفع',
    settings: 'الإعدادات',
    ownerStatements: 'كشف حساب المالك',
    paymentTracking: 'تتبع الدفع',
    expenses: 'المصروفات',
    welcomeBack: 'مرحباً بعودتك',
    enterYourCredentialsToAccessYourAccount: 'أدخل بيانات الاعتماد الخاصة بك للوصول إلى حسابك',
    signingIn: 'جاري تسجيل الدخول...',
    signIn: 'تسجيل الدخول',
    dontHaveAnAccount: 'لا تمتلك حساباً؟',
    propertyManagementSystem: 'نظام إدارة الممتلكات',
    loginFailed: 'فشل تسجيل الدخول',
    anErrorOccurredPleaseTryAgain: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    passwordsDoNotMatch: 'كلمات المرور غير متطابقة',
    registrationFailed: 'فشل التسجيل',
    createAnAccount: 'إنشاء حساب',
    enterYourDetailsToGetStarted: 'أدخل تفاصيلك للبدء',
    confirmPassword: 'تأكيد كلمة المرور',
    creatingAccount: 'جاري إنشاء الحساب...',
    createAccount: 'إنشاء حساب',
    alreadyHaveAnAccount: 'هل تمتلك حساباً مسبقاً؟',
    propertySettings: 'إعدادات العقار',
    supportTitle: 'الدعم',
    supportSubtitle: 'نحن هنا لنساعدك على مدار الساعة 24/7. اتصل بنا من خلال أي من الطرق التالية',
    contactInfo: 'معلومات الاتصال',
    available247: 'متاح 24/7',
    whatsappDescription: 'دردش معنا على واتساب للحصول على دعم ومساعدة سريعة',
    contactViaWhatsApp: 'الاتصال عبر واتساب',
    emailDescription: 'أرسل لنا بريدًا إلكترونيًا وسنتواصل معك في أسرع وقت ممكن',
    sendEmail: 'إرسال بريد إلكتروني',
    adminContact: 'معلومات اتصال المشرف',
    backToHome: 'العودة إلى الرئيسية',
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [isRTL, setIsRTL] = useState<boolean>(false);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage && ['en', 'ar'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    } else {
      // Detect user's language preference
      const browserLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
      setLanguage(browserLang as Language);
    }
  }, []);

  // Update RTL when language changes
  useEffect(() => {
    const newIsRTL = language === 'ar';
    setIsRTL(newIsRTL);

    // Update document direction
    document.documentElement.dir = newIsRTL ? 'rtl' : 'ltr';

    // Update document language
    document.documentElement.lang = language;

    // Apply RTL styles if needed
    if (newIsRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language]);

  // Save language preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[language][key as keyof typeof translations.en];
    return translation || key; // Return the key if translation is not found
  };

  const value = {
    language,
    setLanguage,
    t,
    isRTL
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};