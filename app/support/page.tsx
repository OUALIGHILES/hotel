"use client";

import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Globe } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function SupportPage() {
  const { t, language } = useLanguage();

  // Admin contact information
  const adminWhatsAppNumber = "+96650862900";
  const adminEmail = "welhost.sa@gmail.com";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-700">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Globe className="w-8 h-8 text-primary" />
            <div className="text-xl font-bold text-primary">Welhost</div>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-foreground hover:text-muted-foreground">
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </header>

      {/* Support Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-foreground">{t('supportTitle')}</h1>
            <p className="text-xl text-muted-foreground">{t('supportSubtitle')}</p>
          </div>

          <div className="bg-card rounded-xl shadow-lg p-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-2">{t('contactInfo')}</h2>
              <p className="text-muted-foreground">{t('available247')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Support Card */}
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                    <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">WhatsApp</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  {t('whatsappDescription')}
                </p>
                <Link href={`https://wa.me/${adminWhatsAppNumber}`} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t('contactViaWhatsApp')}
                  </Button>
                </Link>
              </div>

              {/* Email Support Card */}
              <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{t('email')}</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  {t('emailDescription')}
                </p>
                <Link href={`mailto:${adminEmail}`}>
                  <Button variant="outline" className="w-full">
                    <Mail className="w-4 h-4 mr-2" />
                    {t('sendEmail')}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Admin Contact Info */}
            <div className="mt-10 pt-6 border-t">
              <h3 className="text-lg font-semibold text-foreground mb-4">{t('adminContact')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="w-5 h-5 text-primary" />
                  <span className="text-foreground">WhatsApp: {adminWhatsAppNumber}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="text-foreground">Email: {adminEmail}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}