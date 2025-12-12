"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, X, Upload, Clock, Users, Home, CreditCard, Car, Utensils, Settings, KeyRoundIcon, Bell, MessageSquare, Eye } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';

// Define form schema
const propertySettingsSchema = z.object({
  // Property Details - now using propertyId to select the property
  propertyId: z.string().min(1, 'Property selection is required'),
  propertyType: z.string().min(1, 'Property type is required'),
  address: z.string().min(1, 'Address is required'),
  checkInTime: z.string(),
  checkOutTime: z.string(),
  maxOccupancy: z.number().min(1, 'Max occupancy must be at least 1'),
  houseRules: z.string().optional(),
  directions: z.string().optional(),

  // Pricing
  basePrice: z.number().min(0, 'Base price must be positive'),
  weekendPrice: z.number().min(0, 'Weekend price must be positive'),

  // Discounts
  weeklyDiscountPercent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  monthlyDiscountPercent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  lastMinuteDiscountPercent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),
  earlyBookingDiscountPercent: z.number().min(0).max(100, 'Discount cannot exceed 100%'),

  // Stay restrictions
  minimumNights: z.number().min(1, 'Must be at least 1 night'),
  maximumNights: z.number().min(1, 'Must be at least 1 night'),
  allowSameDayBooking: z.boolean(),
  sameDayCutoffTime: z.string(),

  // Auto Messages
  bookingConfirmationMsg: z.string().optional(),
  preArrivalInstructionsMsg: z.string().optional(),
  smartLockCodeMsg: z.string().optional(),
  welcomeMsg: z.string().optional(),
  checkoutInstructionsMsg: z.string().optional(),
  postCheckoutThanksMsg: z.string().optional(),

  // Guest Guide
  guestGuidePdfUrl: z.string().optional(),
  wifiCredentials: z.string().optional(),
  propertyRules: z.string().optional(),
  instructions: z.string().optional(),

  // Housekeeping
  autoCreateCleaningTasks: z.boolean(),
  cleaningFee: z.number().min(0).optional(),
  turnoverHours: z.number().min(0).optional(),

  // Maintenance
  autoNotifyTechnician: z.boolean(),

  // Payments
  securityDepositRequired: z.boolean(),
  securityDepositAmount: z.number().min(0, 'Security deposit must be positive').optional(),

  // Taxes
  vatEnabled: z.boolean(),
  vatPercentage: z.number().min(0).optional(),
  tourismTaxEnabled: z.boolean(),
  tourismTaxAmount: z.number().min(0).optional(),

  // Invoice settings
  invoiceFooterText: z.string().optional(),
  invoiceLogoUrl: z.string().optional(),
  invoiceTerms: z.string().optional(),

  // Notifications
  notifyNewBooking: z.boolean(),
  notifyCancellation: z.boolean(),
  notifyPaymentReceived: z.boolean(),
  notifyGuestMessage: z.boolean(),
  notifyCleaningTaskAssigned: z.boolean(),
  notifyMaintenanceIssue: z.boolean(),

  // Website settings
  websiteDescription: z.string().optional(),
  bookingPolicy: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  customDomain: z.string().optional(),
  seoTitle: z.string().optional(),

  // Booking engine
  enableDirectBooking: z.boolean(),
  acceptOnlinePayments: z.boolean(),

  // Automation
  autoSendWelcomeMsg: z.boolean(),
  autoGenerateSmartLockCode: z.boolean(),
  autoCreateCleaningTask: z.boolean(),
  autoCloseCleaningTask: z.boolean(),
  autoUpdatePricesBasedOnOccupancy: z.boolean(),

  // Reports
  defaultReportPeriod: z.string().optional(),
});

type PropertySettingsFormValues = z.infer<typeof propertySettingsSchema>;

export default function PropertySettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [cleaningChecklist, setCleaningChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<{id: string, name: string}[]>([]);

  const form = useForm<PropertySettingsFormValues>({
    resolver: zodResolver(propertySettingsSchema),
    defaultValues: {
      propertyId: '',
      propertyType: '',
      address: '',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      maxOccupancy: 1,
      houseRules: '',
      directions: '',
      basePrice: 0,
      weekendPrice: 0,
      weeklyDiscountPercent: 0,
      monthlyDiscountPercent: 0,
      lastMinuteDiscountPercent: 0,
      earlyBookingDiscountPercent: 0,
      minimumNights: 1,
      maximumNights: 30,
      allowSameDayBooking: false,
      sameDayCutoffTime: '12:00',
      bookingConfirmationMsg: '',
      preArrivalInstructionsMsg: '',
      smartLockCodeMsg: '',
      welcomeMsg: '',
      checkoutInstructionsMsg: '',
      postCheckoutThanksMsg: '',
      guestGuidePdfUrl: '',
      wifiCredentials: '',
      propertyRules: '',
      instructions: '',
      autoCreateCleaningTasks: true,
      cleaningFee: 0,
      turnoverHours: 2,
      autoNotifyTechnician: true,
      securityDepositRequired: false,
      securityDepositAmount: 0,
      vatEnabled: false,
      vatPercentage: 0,
      tourismTaxEnabled: false,
      tourismTaxAmount: 0,
      invoiceFooterText: '',
      invoiceLogoUrl: '',
      invoiceTerms: '',
      notifyNewBooking: true,
      notifyCancellation: true,
      notifyPaymentReceived: true,
      notifyGuestMessage: true,
      notifyCleaningTaskAssigned: true,
      notifyMaintenanceIssue: true,
      websiteDescription: '',
      bookingPolicy: '',
      cancellationPolicy: '',
      customDomain: '',
      seoTitle: '',
      enableDirectBooking: true,
      acceptOnlinePayments: false,
      autoSendWelcomeMsg: true,
      autoGenerateSmartLockCode: false,
      autoCreateCleaningTask: true,
      autoCloseCleaningTask: true,
      autoUpdatePricesBasedOnOccupancy: false,
      defaultReportPeriod: 'monthly',
    },
  });

  // Load properties and settings on component mount
  useEffect(() => {
    const loadPropertiesAndSettings = async () => {
      try {
        // Load properties using API route
        const response = await fetch('/api/properties');
        if (!response.ok) {
          throw new Error('Failed to load properties');
        }
        const propertiesData = await response.json();
        setProperties(propertiesData);

        // Load settings for the first property if available
        if (propertiesData && propertiesData.length > 0) {
          const propertyId = propertiesData[0].id;
          form.setValue('propertyId', propertyId);

          const settingsResponse = await fetch(`/api/property-settings/${propertyId}`);
          if (!settingsResponse.ok) {
            // If no settings exist for this property, that's OK - we'll have default values
            return;
          }
          const settingsData = await settingsResponse.json();

          // Set form values
          form.reset({
            propertyId,
            propertyType: settingsData.property_type || '',
            address: settingsData.address || '',
            checkInTime: settingsData.check_in_time || settingsData.check_in || '15:00',
            checkOutTime: settingsData.check_out_time || settingsData.check_out || '11:00',
            maxOccupancy: settingsData.max_occupancy || 1,
            houseRules: settingsData.house_rules || '',
            directions: settingsData.directions || '',
            basePrice: settingsData.base_price || 0,
            weekendPrice: settingsData.weekend_price || 0,
            weeklyDiscountPercent: settingsData.weekly_discount_percent || 0,
            monthlyDiscountPercent: settingsData.monthly_discount_percent || 0,
            lastMinuteDiscountPercent: settingsData.last_minute_discount_percent || 0,
            earlyBookingDiscountPercent: settingsData.early_booking_discount_percent || 0,
            minimumNights: settingsData.minimum_nights || 1,
            maximumNights: settingsData.maximum_nights || 30,
            allowSameDayBooking: settingsData.allow_same_day_booking || false,
            sameDayCutoffTime: settingsData.same_day_cutoff_time || '12:00',
            bookingConfirmationMsg: settingsData.booking_confirmation_msg || '',
            preArrivalInstructionsMsg: settingsData.pre_arrival_instructions_msg || '',
            smartLockCodeMsg: settingsData.smart_lock_code_msg || '',
            welcomeMsg: settingsData.welcome_msg || '',
            checkoutInstructionsMsg: settingsData.checkout_instructions_msg || '',
            postCheckoutThanksMsg: settingsData.post_checkout_thanks_msg || '',
            guestGuidePdfUrl: settingsData.guest_guide_pdf_url || '',
            wifiCredentials: settingsData.wifi_credentials || '',
            propertyRules: settingsData.property_rules || '',
            instructions: settingsData.instructions || '',
            autoCreateCleaningTasks: settingsData.auto_create_cleaning_tasks !== undefined ? settingsData.auto_create_cleaning_tasks : true,
            cleaningFee: settingsData.cleaning_fee || 0,
            turnoverHours: settingsData.turnover_hours || 2,
            autoNotifyTechnician: settingsData.auto_notify_technician !== undefined ? settingsData.auto_notify_technician : true,
            securityDepositRequired: settingsData.security_deposit_required || false,
            securityDepositAmount: settingsData.security_deposit_amount || 0,
            vatEnabled: settingsData.vat_enabled || false,
            vatPercentage: settingsData.vat_percentage || 0,
            tourismTaxEnabled: settingsData.tourism_tax_enabled || false,
            tourismTaxAmount: settingsData.tourism_tax_amount || 0,
            invoiceFooterText: settingsData.invoice_footer_text || '',
            invoiceLogoUrl: settingsData.invoice_logo_url || '',
            invoiceTerms: settingsData.invoice_terms || '',
            notifyNewBooking: settingsData.notify_new_booking || true,
            notifyCancellation: settingsData.notify_cancellation || true,
            notifyPaymentReceived: settingsData.notify_payment_received || true,
            notifyGuestMessage: settingsData.notify_guest_message || true,
            notifyCleaningTaskAssigned: settingsData.notify_cleaning_task_assigned || true,
            notifyMaintenanceIssue: settingsData.notify_maintenance_issue || true,
            websiteDescription: settingsData.website_description || '',
            bookingPolicy: settingsData.booking_policy || '',
            cancellationPolicy: settingsData.cancellation_policy || '',
            customDomain: settingsData.custom_domain || '',
            seoTitle: settingsData.seo_title || '',
            enableDirectBooking: settingsData.enable_direct_booking || true,
            acceptOnlinePayments: settingsData.accept_online_payments || false,
            autoSendWelcomeMsg: settingsData.auto_send_welcome_msg !== undefined ? settingsData.auto_send_welcome_msg : true,
            autoGenerateSmartLockCode: settingsData.auto_generate_smart_lock_code !== undefined ? settingsData.auto_generate_smart_lock_code : false,
            autoCreateCleaningTask: settingsData.auto_create_cleaning_task !== undefined ? settingsData.auto_create_cleaning_task : true,
            autoCloseCleaningTask: settingsData.auto_close_cleaning_task !== undefined ? settingsData.auto_close_cleaning_task : true,
            autoUpdatePricesBasedOnOccupancy: settingsData.auto_update_prices_based_on_occupancy !== undefined ? settingsData.auto_update_prices_based_on_occupancy : false,
            defaultReportPeriod: settingsData.default_report_period || 'monthly',
          });

          // Set other state values
          setAmenities(settingsData.amenities || []);
          setImages(settingsData.images || []);
          setCleaningChecklist(settingsData.cleaning_checklist || []);
        }
      } catch (error) {
        console.error('Error loading properties and settings:', error);
        toast.error('Failed to load properties and settings');
      } finally {
        setLoading(false);
      }
    };

    loadPropertiesAndSettings();
  }, [form]);

  const handleAddAmenity = () => {
    if (newAmenity.trim() !== '' && !amenities.includes(newAmenity.trim())) {
      setAmenities([...amenities, newAmenity.trim()]);
      setNewAmenity('');
    }
  };

  const handleRemoveAmenity = (index: number) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim() !== '' && !cleaningChecklist.includes(newChecklistItem.trim())) {
      setCleaningChecklist([...cleaningChecklist, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setCleaningChecklist(cleaningChecklist.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PropertySettingsFormValues) => {
    try {
      // Get the selected property name based on the property ID
      const selectedProperty = properties.find(prop => prop.id === data.propertyId);
      const propertyName = selectedProperty ? selectedProperty.name : '';

      const settingsToSave = {
        property_id: data.propertyId,
        property_name: propertyName,
        address: data.address,
        property_type: data.propertyType,
        check_in_time: data.checkInTime,
        check_out_time: data.checkOutTime,
        max_occupancy: data.maxOccupancy,
        house_rules: data.houseRules,
        directions: data.directions,
        base_price: data.basePrice,
        weekend_price: data.weekendPrice,
        weekly_discount_percent: data.weeklyDiscountPercent,
        monthly_discount_percent: data.monthlyDiscountPercent,
        last_minute_discount_percent: data.lastMinuteDiscountPercent,
        early_booking_discount_percent: data.earlyBookingDiscountPercent,
        minimum_nights: data.minimumNights,
        maximum_nights: data.maximumNights,
        allow_same_day_booking: data.allowSameDayBooking,
        same_day_cutoff_time: data.sameDayCutoffTime,
        booking_confirmation_msg: data.bookingConfirmationMsg,
        pre_arrival_instructions_msg: data.preArrivalInstructionsMsg,
        smart_lock_code_msg: data.smartLockCodeMsg,
        welcome_msg: data.welcomeMsg,
        checkout_instructions_msg: data.checkoutInstructionsMsg,
        post_checkout_thanks_msg: data.postCheckoutThanksMsg,
        guest_guide_pdf_url: data.guestGuidePdfUrl,
        wifi_credentials: data.wifiCredentials,
        property_rules: data.propertyRules,
        instructions: data.instructions,
        auto_create_cleaning_tasks: data.autoCreateCleaningTasks,
        cleaning_fee: data.cleaningFee,
        turnover_hours: data.turnoverHours,
        auto_notify_technician: data.autoNotifyTechnician,
        security_deposit_required: data.securityDepositRequired,
        security_deposit_amount: data.securityDepositRequired ? data.securityDepositAmount : 0,
        vat_enabled: data.vatEnabled,
        vat_percentage: data.vatPercentage,
        tourism_tax_enabled: data.tourismTaxEnabled,
        tourism_tax_amount: data.tourismTaxAmount,
        invoice_footer_text: data.invoiceFooterText,
        invoice_logo_url: data.invoiceLogoUrl,
        invoice_terms: data.invoiceTerms,
        notify_new_booking: data.notifyNewBooking,
        notify_cancellation: data.notifyCancellation,
        notify_payment_received: data.notifyPaymentReceived,
        notify_guest_message: data.notifyGuestMessage,
        notify_cleaning_task_assigned: data.notifyCleaningTaskAssigned,
        notify_maintenance_issue: data.notifyMaintenanceIssue,
        website_description: data.websiteDescription,
        booking_policy: data.bookingPolicy,
        cancellation_policy: data.cancellationPolicy,
        custom_domain: data.customDomain,
        seo_title: data.seoTitle,
        enable_direct_booking: data.enableDirectBooking,
        accept_online_payments: data.acceptOnlinePayments,
        auto_send_welcome_msg: data.autoSendWelcomeMsg,
        auto_generate_smart_lock_code: data.autoGenerateSmartLockCode,
        auto_create_cleaning_task: data.autoCreateCleaningTask,
        auto_close_cleaning_task: data.autoCloseCleaningTask,
        auto_update_prices_based_on_occupancy: data.autoUpdatePricesBasedOnOccupancy,
        default_report_period: data.defaultReportPeriod,
        amenities: amenities,
        cleaning_checklist: cleaningChecklist,
        images: images,
      };

      const response = await fetch('/api/property-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save property settings');
      }

      toast.success('Property settings saved successfully!');
    } catch (error) {
      console.error('Error saving property settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save property settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading property settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Property Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage all property-related configurations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Reset</Button>
          <Button onClick={form.handleSubmit(onSubmit)}>Save Changes</Button>
        </div>
      </div>

      {/* Property Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="propertyId">Select Property</Label>
            <Select
              value={form.watch('propertyId')}
              onValueChange={(value) => {
                form.setValue('propertyId', value);
                // Reload settings when property changes
                const loadSettings = async () => {
                  try {
                    const response = await fetch(`/api/property-settings/${value}`);
                    if (!response.ok) {
                      // If no settings exist for this property, that's OK
                      return;
                    }
                    const data = await response.json();

                    // Set form values
                    form.reset({
                      propertyId: value,
                      propertyType: data.property_type || '',
                      address: data.address || '',
                      checkInTime: data.check_in_time || data.check_in || '15:00',
                      checkOutTime: data.check_out_time || data.check_out || '11:00',
                      maxOccupancy: data.max_occupancy || 1,
                      houseRules: data.house_rules || '',
                      directions: data.directions || '',
                      basePrice: data.base_price || 0,
                      weekendPrice: data.weekend_price || 0,
                      weeklyDiscountPercent: data.weekly_discount_percent || 0,
                      monthlyDiscountPercent: data.monthly_discount_percent || 0,
                      lastMinuteDiscountPercent: data.last_minute_discount_percent || 0,
                      earlyBookingDiscountPercent: data.early_booking_discount_percent || 0,
                      minimumNights: data.minimum_nights || 1,
                      maximumNights: data.maximum_nights || 30,
                      allowSameDayBooking: data.allow_same_day_booking || false,
                      sameDayCutoffTime: data.same_day_cutoff_time || '12:00',
                      bookingConfirmationMsg: data.booking_confirmation_msg || '',
                      preArrivalInstructionsMsg: data.pre_arrival_instructions_msg || '',
                      smartLockCodeMsg: data.smart_lock_code_msg || '',
                      welcomeMsg: data.welcome_msg || '',
                      checkoutInstructionsMsg: data.checkout_instructions_msg || '',
                      postCheckoutThanksMsg: data.post_checkout_thanks_msg || '',
                      guestGuidePdfUrl: data.guest_guide_pdf_url || '',
                      wifiCredentials: data.wifi_credentials || '',
                      propertyRules: data.property_rules || '',
                      instructions: data.instructions || '',
                      autoCreateCleaningTasks: data.auto_create_cleaning_tasks !== undefined ? data.auto_create_cleaning_tasks : true,
                      cleaningFee: data.cleaning_fee || 0,
                      turnoverHours: data.turnover_hours || 2,
                      autoNotifyTechnician: data.auto_notify_technician !== undefined ? data.auto_notify_technician : true,
                      securityDepositRequired: data.security_deposit_required || false,
                      securityDepositAmount: data.security_deposit_amount || 0,
                      vatEnabled: data.vat_enabled || false,
                      vatPercentage: data.vat_percentage || 0,
                      tourismTaxEnabled: data.tourism_tax_enabled || false,
                      tourismTaxAmount: data.tourism_tax_amount || 0,
                      invoiceFooterText: data.invoice_footer_text || '',
                      invoiceLogoUrl: data.invoice_logo_url || '',
                      invoiceTerms: data.invoice_terms || '',
                      notifyNewBooking: data.notify_new_booking || true,
                      notifyCancellation: data.notify_cancellation || true,
                      notifyPaymentReceived: data.notify_payment_received || true,
                      notifyGuestMessage: data.notify_guest_message || true,
                      notifyCleaningTaskAssigned: data.notify_cleaning_task_assigned || true,
                      notifyMaintenanceIssue: data.notify_maintenance_issue || true,
                      websiteDescription: data.website_description || '',
                      bookingPolicy: data.booking_policy || '',
                      cancellationPolicy: data.cancellation_policy || '',
                      customDomain: data.custom_domain || '',
                      seoTitle: data.seo_title || '',
                      enableDirectBooking: data.enable_direct_booking || true,
                      acceptOnlinePayments: data.accept_online_payments || false,
                      autoSendWelcomeMsg: data.auto_send_welcome_msg !== undefined ? data.auto_send_welcome_msg : true,
                      autoGenerateSmartLockCode: data.auto_generate_smart_lock_code !== undefined ? data.auto_generate_smart_lock_code : false,
                      autoCreateCleaningTask: data.auto_create_cleaning_task !== undefined ? data.auto_create_cleaning_task : true,
                      autoCloseCleaningTask: data.auto_close_cleaning_task !== undefined ? data.auto_close_cleaning_task : true,
                      autoUpdatePricesBasedOnOccupancy: data.auto_update_prices_based_on_occupancy !== undefined ? data.auto_update_prices_based_on_occupancy : false,
                      defaultReportPeriod: data.default_report_period || 'monthly',
                    });

                    // Set other state values
                    setAmenities(data.amenities || []);
                    setImages(data.images || []);
                    setCleaningChecklist(data.cleaning_checklist || []);
                  } catch (error) {
                    console.error('Error loading property settings:', error);
                    toast.error('Failed to load property settings');
                  }
                };
                loadSettings();
              }}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit sm:grid-cols-4 lg:grid-cols-6 overflow-x-auto">
          <TabsTrigger value="general" className="whitespace-nowrap">
            <Settings className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="pricing" className="whitespace-nowrap">
            <CreditCard className="mr-2 h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="calendar" className="whitespace-nowrap">
            <Clock className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="guest" className="whitespace-nowrap">
            <Users className="mr-2 h-4 w-4" />
            Guest Experience
          </TabsTrigger>
          <TabsTrigger value="operations" className="whitespace-nowrap">
            <Home className="mr-2 h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="financial" className="whitespace-nowrap">
            <CreditCard className="mr-2 h-4 w-4" />
            Financial
          </TabsTrigger>
        </TabsList>

        {/* General Tab - Property Details */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select {...form.register('propertyType')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apartment">Apartment</SelectItem>
                      <SelectItem value="Villa">Villa</SelectItem>
                      <SelectItem value="Tent">Tent</SelectItem>
                      <SelectItem value="Chalet">Chalet</SelectItem>
                      <SelectItem value="Room">Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...form.register('address')}
                    placeholder="Enter address"
                  />
                  {form.formState.errors.address && (
                    <p className="text-red-500 text-sm">{form.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxOccupancy">Maximum Occupancy</Label>
                  <Input
                    id="maxOccupancy"
                    type="number"
                    {...form.register('maxOccupancy', { valueAsNumber: true })}
                    placeholder="Enter maximum number of guests"
                  />
                  {form.formState.errors.maxOccupancy && (
                    <p className="text-red-500 text-sm">{form.formState.errors.maxOccupancy.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkInTime">Check-in Time</Label>
                  <Input
                    id="checkInTime"
                    type="time"
                    {...form.register('checkInTime')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkOutTime">Check-out Time</Label>
                  <Input
                    id="checkOutTime"
                    type="time"
                    {...form.register('checkOutTime')}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Property Amenities</Label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {amenity}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAmenity(index)}
                        className="ml-1 text-destructive hover:text-destructive/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    placeholder="Add new amenity (e.g., WiFi, Pool)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAmenity();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={handleAddAmenity}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>House Rules</Label>
                <Textarea
                  {...form.register('houseRules')}
                  placeholder="Enter house rules and policies"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Directions & Location Guide</Label>
                <Textarea
                  {...form.register('directions')}
                  placeholder="Provide directions and location guide for guests"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Property Images</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img src={image} alt={`Property ${index + 1}`} className="w-32 h-32 object-cover rounded-md border" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-md w-32 h-32 cursor-pointer hover:bg-muted">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="mt-2 text-xs text-muted-foreground">Add Image</span>
                    <input type="file" className="hidden" accept="image/*" multiple />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Unit Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Manage individual units/rooms in your property</p>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Unit 101</h3>
                      <p className="text-sm text-muted-foreground">Double Bed, Sleeps 2</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/units">Edit</Link>
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">Unit 102</h3>
                      <p className="text-sm text-muted-foreground">Queen Bed, Sleeps 2</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/units">Edit</Link>
                    </Button>
                  </div>
                </Card>

                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/units">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Unit
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pricing Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Nightly Rate ($)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    {...form.register('basePrice', { valueAsNumber: true })}
                    placeholder="Enter base rate"
                  />
                  {form.formState.errors.basePrice && (
                    <p className="text-red-500 text-sm">{form.formState.errors.basePrice.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="weekendPrice">Weekend Rate ($)</Label>
                  <Input
                    id="weekendPrice"
                    type="number"
                    step="0.01"
                    {...form.register('weekendPrice', { valueAsNumber: true })}
                    placeholder="Enter weekend rate"
                  />
                  {form.formState.errors.weekendPrice && (
                    <p className="text-red-500 text-sm">{form.formState.errors.weekendPrice.message}</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">Discounts</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="weeklyDiscount">Weekly Discount (%)</Label>
                    <Input
                      id="weeklyDiscount"
                      type="number"
                      step="0.01"
                      {...form.register('weeklyDiscountPercent', { valueAsNumber: true })}
                      placeholder="e.g., 10"
                    />
                    {form.formState.errors.weeklyDiscountPercent && (
                      <p className="text-red-500 text-sm">{form.formState.errors.weeklyDiscountPercent.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthlyDiscount">Monthly Discount (%)</Label>
                    <Input
                      id="monthlyDiscount"
                      type="number"
                      step="0.01"
                      {...form.register('monthlyDiscountPercent', { valueAsNumber: true })}
                      placeholder="e.g., 15"
                    />
                    {form.formState.errors.monthlyDiscountPercent && (
                      <p className="text-red-500 text-sm">{form.formState.errors.monthlyDiscountPercent.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastMinuteDiscount">Last-minute Discount (%)</Label>
                    <Input
                      id="lastMinuteDiscount"
                      type="number"
                      step="0.01"
                      {...form.register('lastMinuteDiscountPercent', { valueAsNumber: true })}
                      placeholder="e.g., 20"
                    />
                    {form.formState.errors.lastMinuteDiscountPercent && (
                      <p className="text-red-500 text-sm">{form.formState.errors.lastMinuteDiscountPercent.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="earlyBookingDiscount">Early Booking Discount (%)</Label>
                    <Input
                      id="earlyBookingDiscount"
                      type="number"
                      step="0.01"
                      {...form.register('earlyBookingDiscountPercent', { valueAsNumber: true })}
                      placeholder="e.g., 5"
                    />
                    {form.formState.errors.earlyBookingDiscountPercent && (
                      <p className="text-red-500 text-sm">{form.formState.errors.earlyBookingDiscountPercent.message}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">Minimum / Maximum Stay</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minimumNights">Minimum Nights</Label>
                    <Input
                      id="minimumNights"
                      type="number"
                      {...form.register('minimumNights', { valueAsNumber: true })}
                      placeholder="e.g., 2"
                    />
                    {form.formState.errors.minimumNights && (
                      <p className="text-red-500 text-sm">{form.formState.errors.minimumNights.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maximumNights">Maximum Nights</Label>
                    <Input
                      id="maximumNights"
                      type="number"
                      {...form.register('maximumNights', { valueAsNumber: true })}
                      placeholder="e.g., 30"
                    />
                    {form.formState.errors.maximumNights && (
                      <p className="text-red-500 text-sm">{form.formState.errors.maximumNights.message}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sameDayBooking"
                      checked={form.watch('allowSameDayBooking')}
                      onCheckedChange={(checked) => form.setValue('allowSameDayBooking', checked)}
                    />
                    <Label htmlFor="sameDayBooking">Allow Same-day Booking</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sameDayCutoff">Same-day Booking Cutoff Time</Label>
                    <Input
                      id="sameDayCutoff"
                      type="time"
                      {...form.register('sameDayCutoffTime')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Calendar Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Calendar Controls</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Block Dates</Label>
                    <div className="mt-2 flex justify-between items-center p-3 border rounded-lg">
                      <span>Select dates to block</span>
                      <Button variant="outline" size="sm">Select</Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Unblock Dates</Label>
                    <div className="mt-2 flex justify-between items-center p-3 border rounded-lg">
                      <span>Select dates to unblock</span>
                      <Button variant="outline" size="sm">Select</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Close Property for Maintenance</Label>
                    <div className="mt-2 flex justify-between items-center p-3 border rounded-lg">
                      <span>Select date range</span>
                      <Button variant="outline" size="sm">Date Range</Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Add Manual Bookings</Label>
                    <div className="mt-2 flex justify-between items-center p-3 border rounded-lg">
                      <span>Record offline bookings</span>
                      <Button variant="outline" size="sm">Add</Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">Sync Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Availability Sync</h4>
                      <p className="text-sm text-muted-foreground">Sync availability across all channels</p>
                    </div>
                    <Switch defaultChecked={true} />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Price Sync</h4>
                      <p className="text-sm text-muted-foreground">Sync prices across all channels</p>
                    </div>
                    <Switch defaultChecked={true} />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Booking Import</h4>
                      <p className="text-sm text-muted-foreground">Import bookings from external channels</p>
                    </div>
                    <Switch defaultChecked={true} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guest Experience Tab */}
        <TabsContent value="guest" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Guest Experience Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Auto Messages
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirmationMsg">Booking Confirmation Message</Label>
                    <Textarea
                      id="confirmationMsg"
                      {...form.register('bookingConfirmationMsg')}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preArrivalMsg">Pre-Arrival Instructions</Label>
                    <Textarea
                      id="preArrivalMsg"
                      {...form.register('preArrivalInstructionsMsg')}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lockCodeMsg">Smart Lock Code Message</Label>
                    <Textarea
                      id="lockCodeMsg"
                      {...form.register('smartLockCodeMsg')}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="welcomeMsg">Welcome Message</Label>
                    <Textarea
                      id="welcomeMsg"
                      {...form.register('welcomeMsg')}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkoutMsg">Checkout Instructions</Label>
                    <Textarea
                      id="checkoutMsg"
                      {...form.register('checkoutInstructionsMsg')}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thankyouMsg">Post-Checkout Thank You</Label>
                    <Textarea
                      id="thankyouMsg"
                      {...form.register('postCheckoutThanksMsg')}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Guest Guide
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="wifiCreds">WiFi Credentials</Label>
                    <Input
                      id="wifiCreds"
                      {...form.register('wifiCredentials')}
                      placeholder="Enter WiFi network name and password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyRules">Property Rules</Label>
                    <Input
                      id="propertyRules"
                      {...form.register('propertyRules')}
                      placeholder="Enter property rules"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="instructions">Additional Instructions</Label>
                    <Textarea
                      id="instructions"
                      {...form.register('instructions')}
                      placeholder="Enter instructions for parking, AC, housekeeping, etc."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Upload Welcome Guide (PDF)</Label>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="w-full justify-start" type="button">
                        <Upload className="h-4 w-4 mr-2" />
                        {form.watch('guestGuidePdfUrl') ? 'Upload New File' : 'Choose File'}
                      </Button>
                      {form.watch('guestGuidePdfUrl') && (
                        <span className="text-sm text-muted-foreground">Current: guide.pdf</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Housekeeping & Operations Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Housekeeping Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoCreateCleaning"
                      checked={form.watch('autoCreateCleaningTasks')}
                      onCheckedChange={(checked) => form.setValue('autoCreateCleaningTasks', checked)}
                    />
                    <Label htmlFor="autoCreateCleaning">Auto-create cleaning tasks after checkout</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cleaningFee">Cleaning Fee ($)</Label>
                    <Input
                      id="cleaningFee"
                      type="number"
                      step="0.01"
                      {...form.register('cleaningFee', { valueAsNumber: true })}
                      placeholder="Enter cleaning fee"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Cleaning Checklist</Label>
                    <div className="space-y-2">
                      {cleaningChecklist.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Checkbox id={`checklist-${index}`} defaultChecked />
                          <Label htmlFor={`checklist-${index}`} className="flex-grow">{item}</Label>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(index)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}

                      <div className="flex gap-2 pt-2">
                        <Input
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          placeholder="Add new checklist item"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddChecklistItem();
                            }
                          }}
                        />
                        <Button type="button" variant="outline" onClick={handleAddChecklistItem}>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="turnoverTime">Turnover Time (hours)</Label>
                    <Input
                      id="turnoverTime"
                      type="number"
                      {...form.register('turnoverHours', { valueAsNumber: true })}
                      placeholder="Enter time in hours"
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">Maintenance Settings</h3>
                
                <div className="space-y-2">
                  <Label>Maintenance Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Plumbing', 'Electrical', 'HVAC', 'Furniture', 'Appliance'].map((category, index) => (
                      <Badge key={index} variant="secondary">{category}</Badge>
                    ))}
                    <Badge variant="outline" className="cursor-pointer">
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoNotifyTech"
                    checked={form.watch('autoNotifyTechnician')}
                    onCheckedChange={(checked) => form.setValue('autoNotifyTechnician', checked)}
                  />
                  <Label htmlFor="autoNotifyTech">Auto-notify technician when guest reports issue</Label>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <KeyRoundIcon className="h-4 w-4" />
                  Smart Lock Settings
                </h3>
                
                <div className="space-y-2">
                  <Label>Default Smart Lock Behavior</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoGenCode"
                        checked={form.watch('autoGenerateSmartLockCode')}
                        onCheckedChange={(checked) => form.setValue('autoGenerateSmartLockCode', checked)}
                      />
                      <Label htmlFor="autoGenCode">Auto-generate code on booking</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoSendEmail"
                        checked={form.watch('autoSendWelcomeMsg')} // Using this field as a placeholder since we don't have specific email field for lock code
                        onCheckedChange={(checked) => form.setValue('autoSendWelcomeMsg', checked)}
                      />
                      <Label htmlFor="autoSendEmail">Auto-send code by email</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="autoSendSms"
                        checked={form.watch('autoSendWelcomeMsg')} // Using this field as a placeholder since we don't have specific SMS field for lock code
                        onCheckedChange={(checked) => form.setValue('autoSendWelcomeMsg', checked)}
                      />
                      <Label htmlFor="autoSendSms">Auto-send code by SMS</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="codeValidity">Code Validity Duration (minutes)</Label>
                      <Input
                        id="codeValidity"
                        type="number"
                        defaultValue="1440"
                        placeholder="Duration in minutes"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Financial Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Deposit & Payments</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="securityDeposit" 
                      checked={form.watch('securityDepositRequired')}
                      onCheckedChange={(checked) => form.setValue('securityDepositRequired', checked)} 
                    />
                    <Label htmlFor="securityDeposit">Security deposit required</Label>
                  </div>
                  
                  {form.watch('securityDepositRequired') && (
                    <div className="space-y-2">
                      <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        step="0.01"
                        {...form.register('securityDepositAmount', { valueAsNumber: true })}
                        placeholder="Enter deposit amount"
                      />
                      {form.formState.errors.securityDepositAmount && (
                        <p className="text-red-500 text-sm">{form.formState.errors.securityDepositAmount.message}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label>Accepted Payment Methods</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      {[
                        { id: 'cash', label: 'Cash' },
                        { id: 'bank_transfer', label: 'Bank Transfer' },
                        { id: 'pos', label: 'POS' },
                        { id: 'online', label: 'Online Payments' },
                      ].map((method) => (
                        <div key={method.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={method.id}
                          />
                          <Label htmlFor={method.id}>{method.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">Tax Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableVat"
                      checked={form.watch('vatEnabled')}
                      onCheckedChange={(checked) => form.setValue('vatEnabled', checked)}
                    />
                    <Label htmlFor="enableVat">Enable VAT</Label>
                  </div>

                  {form.watch('vatEnabled') && (
                    <div className="space-y-2">
                      <Label htmlFor="vatPercentage">VAT Percentage (%)</Label>
                      <Input
                        id="vatPercentage"
                        type="number"
                        step="0.01"
                        {...form.register('vatPercentage', { valueAsNumber: true })}
                        placeholder="Enter VAT percentage"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableTourismTax"
                      checked={form.watch('tourismTaxEnabled')}
                      onCheckedChange={(checked) => form.setValue('tourismTaxEnabled', checked)}
                    />
                    <Label htmlFor="enableTourismTax">Enable Tourism Fee</Label>
                  </div>

                  {form.watch('tourismTaxEnabled') && (
                    <div className="space-y-2">
                      <Label htmlFor="tourismTaxAmount">Tourism Fee Amount ($)</Label>
                      <Input
                        id="tourismTaxAmount"
                        type="number"
                        step="0.01"
                        {...form.register('tourismTaxAmount', { valueAsNumber: true })}
                        placeholder="Enter tourism fee amount"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold">Invoice Settings</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="invoiceFooter">Invoice Footer Text</Label>
                  <Textarea
                    id="invoiceFooter"
                    {...form.register('invoiceFooterText')}
                    placeholder="Enter text to appear in invoice footer"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceTerms">Invoice Terms</Label>
                  <Textarea
                    id="invoiceTerms"
                    {...form.register('invoiceTerms')}
                    placeholder="Enter invoice terms and conditions"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload Invoice Logo</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="w-full justify-start" type="button">
                      <Upload className="h-4 w-4 mr-2" />
                      {form.watch('invoiceLogoUrl') ? 'Upload New Logo' : 'Choose Logo'}
                    </Button>
                    {form.watch('invoiceLogoUrl') && (
                      <span className="text-sm text-muted-foreground">Current: logo.png</span>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notification Settings
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Notification Preferences</Label>
                    <div className="space-y-4 mt-2">
                      {[
                        { id: 'newBooking', label: 'New booking', checked: form.watch('notifyNewBooking'), field: 'notifyNewBooking' },
                        { id: 'cancellation', label: 'Cancellation', checked: form.watch('notifyCancellation'), field: 'notifyCancellation' },
                        { id: 'paymentReceived', label: 'Payment received', checked: form.watch('notifyPaymentReceived'), field: 'notifyPaymentReceived' },
                        { id: 'guestMessage', label: 'Guest message', checked: form.watch('notifyGuestMessage'), field: 'notifyGuestMessage' },
                        { id: 'cleaningTask', label: 'Cleaning task assigned', checked: form.watch('notifyCleaningTaskAssigned'), field: 'notifyCleaningTaskAssigned' },
                        { id: 'maintenanceIssue', label: 'Maintenance issue reported', checked: form.watch('notifyMaintenanceIssue'), field: 'notifyMaintenanceIssue' },
                      ].map((notification) => (
                        <div key={notification.id} className="flex items-center space-x-2">
                          <Switch
                            id={notification.id}
                            checked={form.watch(notification.field)}
                            onCheckedChange={(checked) => form.setValue(notification.field, checked)}
                          />
                          <Label htmlFor={notification.id}>{notification.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Notification Channels</Label>
                    <div className="space-y-4 mt-2">
                      {[
                        { id: 'email', label: 'Email' },
                        { id: 'sms', label: 'SMS' },
                        { id: 'whatsapp', label: 'WhatsApp' },
                        { id: 'push', label: 'Push Notifications' },
                      ].map((channel) => (
                        <div key={channel.id} className="flex items-center space-x-2">
                          <Switch id={`channel-${channel.id}`} />
                          <Label htmlFor={`channel-${channel.id}`}>{channel.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}