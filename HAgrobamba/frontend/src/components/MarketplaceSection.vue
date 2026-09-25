<script setup>
import { ref, reactive } from 'vue'
import { 
  Building2, 
  UserCheck, 
  Send, 
  CheckCircle2, 
  Truck, 
  Globe2, 
  BadgePercent, 
  FileText,
  HelpCircle
} from 'lucide-vue-next'

// Active Tab: 'b2b' vs 'b2c'
const activeChannel = ref('b2b')
const formSubmitted = ref(false)

// Reactive form state ready for FastAPI backend (POST /api/v1/quotes)
const quoteForm = reactive({
  name: '',
  company: '',
  email: '',
  phone: '',
  channelType: activeChannel,
  targetProduct: 'Café Mandango (Verde / Tostado)',
  volumeKg: '100 - 500 kg',
  country: 'Ecuador',
  notes: ''
})

const handleFormSubmit = () => {
  if (!quoteForm.name || !quoteForm.email) return
  formSubmitted.value = true
  setTimeout(() => {
    formSubmitted.value = false
    quoteForm.name = ''
    quoteForm.company = ''
    quoteForm.email = ''
    quoteForm.phone = ''
    quoteForm.notes = ''
  }, 4500)
}
</script>

<template>
  <section id="marketplace" class="py-20 lg:py-32 bg-agrobamba-surface relative">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Section Title -->
      <div class="text-center max-w-3xl mx-auto space-y-4">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-agrobamba-sand border border-agrobamba-border text-agrobamba-coffee text-xs font-semibold uppercase tracking-wider">
          <Building2 class="w-3.5 h-3.5 text-agrobamba-amber" />
          <span>CANALES COMERCIALES DIVERSIFICADOS</span>
        </div>
        <h2 class="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-agrobamba-forest tracking-tight">
          Marketplace B2B Exportación & Venta B2C Directa
        </h2>
        <p class="text-base sm:text-lg text-agrobamba-olive leading-relaxed font-sans">
          Adaptamos nuestra logística para satisfacer tanto a tostaderías e importadoras internacionales en volumen, como a amantes del café de especialidad en compras al por menor.
        </p>

        <!-- Channel Selector Switch -->
        <div class="inline-flex p-1.5 rounded-2xl bg-agrobamba-sand border border-agrobamba-border shadow-inner mt-4">
          <button
            @click="activeChannel = 'b2b'"
            :class="[
              'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2',
              activeChannel === 'b2b'
                ? 'bg-agrobamba-forest text-white shadow-agrobamba-sm'
                : 'text-agrobamba-olive hover:text-agrobamba-forest'
            ]"
          >
            <Building2 class="w-4 h-4 text-agrobamba-amber" />
            <span>Canal B2B (Mayorista / Exportación)</span>
          </button>
          
          <button
            @click="activeChannel = 'b2c'"
            :class="[
              'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2',
              activeChannel === 'b2c'
                ? 'bg-agrobamba-forest text-white shadow-agrobamba-sm'
                : 'text-agrobamba-olive hover:text-agrobamba-forest'
            ]"
          >
            <UserCheck class="w-4 h-4 text-agrobamba-amber" />
            <span>Canal B2C (Consumidor Final)</span>
          </button>
        </div>
      </div>

      <!-- Channel Details & Quote Form Grid -->
      <div class="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        <!-- Left Features Info Column -->
        <div class="lg:col-span-5 space-y-6">
          
          <div v-if="activeChannel === 'b2b'" class="space-y-6">
            <div class="p-6 bg-white rounded-2xl border border-agrobamba-border shadow-agrobamba-sm space-y-4">
              <div class="w-10 h-10 rounded-xl bg-agrobamba-forest/10 flex items-center justify-center text-agrobamba-forest">
                <Globe2 class="w-5 h-5 text-agrobamba-amber" />
              </div>
              <h3 class="font-serif text-2xl font-bold text-agrobamba-forest">Exportación a Medida (FOB / CIF)</h3>
              <p class="text-sm text-agrobamba-olive leading-relaxed">
                Despachamos sacos de yute especiales GrainPro de 69kg para tostadores en Norteamérica, Europa y Asia, garantizando humedad menor al 11%.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-white rounded-xl border border-agrobamba-border">
                <Truck class="w-5 h-5 text-agrobamba-coffee mb-2" />
                <h4 class="font-bold text-xs text-agrobamba-forest uppercase">Logística Flexible</h4>
                <p class="text-xs text-agrobamba-olive mt-1">Cargas consolidadas o contenedor completo.</p>
              </div>

              <div class="p-4 bg-white rounded-xl border border-agrobamba-border">
                <BadgePercent class="w-5 h-5 text-agrobamba-emerald mb-2" />
                <h4 class="font-bold text-xs text-agrobamba-forest uppercase">Precios por Volumen</h4>
                <p class="text-xs text-agrobamba-olive mt-1">Descuentos escalonados a partir de 5 quintales.</p>
              </div>
            </div>
          </div>

          <div v-else class="space-y-6">
            <div class="p-6 bg-white rounded-2xl border border-agrobamba-border shadow-agrobamba-sm space-y-4">
              <div class="w-10 h-10 rounded-xl bg-agrobamba-coffee/10 flex items-center justify-center text-agrobamba-coffee">
                <UserCheck class="w-5 h-5 text-agrobamba-amber" />
              </div>
              <h3 class="font-serif text-2xl font-bold text-agrobamba-forest">Envío Directo a tu Puerta</h3>
              <p class="text-sm text-agrobamba-olive leading-relaxed">
                Llevamos el aroma fresco de las montañas de Loja a tu hogar o cafetería local en 24-48 horas a nivel nacional con empaque de válvula desgasificadora.
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-white rounded-xl border border-agrobamba-border">
                <FileText class="w-5 h-5 text-agrobamba-forest mb-2" />
                <h4 class="font-bold text-xs text-agrobamba-forest uppercase">Facturación Fácil</h4>
                <p class="text-xs text-agrobamba-olive mt-1">Soporte inmediato vía correo electrónico.</p>
              </div>

              <div class="p-4 bg-white rounded-xl border border-agrobamba-border">
                <HelpCircle class="w-5 h-5 text-agrobamba-amber mb-2" />
                <h4 class="font-bold text-xs text-agrobamba-forest uppercase">Suscripción de Café</h4>
                <p class="text-xs text-agrobamba-olive mt-1">Envíos mensuales automáticos con descuento.</p>
              </div>
            </div>
          </div>

        </div>

        <!-- Right Form Column -->
        <div class="lg:col-span-7 bg-white rounded-2xl border border-agrobamba-border p-6 sm:p-8 shadow-agrobamba-md">
          
          <div class="border-b border-agrobamba-border pb-4 mb-6">
            <h3 class="font-serif text-2xl font-bold text-agrobamba-forest">
              {{ activeChannel === 'b2b' ? 'Solicitud de Cotización B2B' : 'Pedido Directo al Consumidor' }}
            </h3>
            <p class="text-xs text-agrobamba-olive mt-1">
              Complete los datos para generar una propuesta o coordinar el despacho.
            </p>
          </div>

          <form @submit.prevent="handleFormSubmit" class="space-y-4">
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-bold uppercase text-agrobamba-olive block mb-1">Nombre Completo *</label>
                <input
                  v-model="quoteForm.name"
                  type="text"
                  required
                  placeholder="Ej. Ing. Carlos Armijos"
                  class="w-full px-4 py-2.5 rounded-xl bg-agrobamba-surface border border-agrobamba-border text-sm text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest"
                />
              </div>

              <div>
                <label class="text-xs font-bold uppercase text-agrobamba-olive block mb-1">Empresa / Negocio</label>
                <input
                  v-model="quoteForm.company"
                  type="text"
                  placeholder="Ej. Coffee Roasters Corp"
                  class="w-full px-4 py-2.5 rounded-xl bg-agrobamba-surface border border-agrobamba-border text-sm text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-bold uppercase text-agrobamba-olive block mb-1">Correo Electrónico *</label>
                <input
                  v-model="quoteForm.email"
                  type="email"
                  required
                  placeholder="contacto@empresa.com"
                  class="w-full px-4 py-2.5 rounded-xl bg-agrobamba-surface border border-agrobamba-border text-sm text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest"
                />
              </div>

              <div>
                <label class="text-xs font-bold uppercase text-agrobamba-olive block mb-1">Teléfono / WhatsApp</label>
                <input
                  v-model="quoteForm.phone"
                  type="tel"
                  placeholder="+593 99 123 4567"
                  class="w-full px-4 py-2.5 rounded-xl bg-agrobamba-surface border border-agrobamba-border text-sm text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-bold uppercase text-agrobamba-olive block mb-1">Producto de Interés</label>
                <select
                  v-model="quoteForm.targetProduct"
                  class="w-full px-4 py-2.5 rounded-xl bg-agrobamba-surface border border-agrobamba-border text-sm text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest"
                >
                  <option value="Café Mandango (Verde / Tostado)">Café Mandango (Verde / Tostado)</option>
                  <option value="Bio-Fertilizantes Orgánicos">Bio-Fertilizantes Orgánicos</option>
                  <option value="Miel & Subproductos Agroforestales">Miel & Subproductos Agroforestales</option>
                </select>
              </div>

              <div>
                <label class="text-xs font-bold uppercase text-agrobamba-olive block mb-1">Volumen Estimado</label>
                <select
                  v-model="quoteForm.volumeKg"
                  class="w-full px-4 py-2.5 rounded-xl bg-agrobamba-surface border border-agrobamba-border text-sm text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest"
                >
                  <option value="1 - 10 kg (Muestras / Retail)">1 - 10 kg (Muestras / Retail)</option>
                  <option value="100 - 500 kg (Micro-Lote)">100 - 500 kg (Micro-Lote)</option>
                  <option value="1,000+ kg (Contenedor B2B)">1,000+ kg (Contenedor B2B)</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs font-bold uppercase text-agrobamba-olive block mb-1">Detalles Adicionales</label>
              <textarea
                v-model="quoteForm.notes"
                rows="3"
                placeholder="Especifique requerimientos de puerto de destino, molienda o certificación especial..."
                class="w-full px-4 py-2.5 rounded-xl bg-agrobamba-surface border border-agrobamba-border text-sm text-agrobamba-charcoal focus:outline-none focus:border-agrobamba-forest"
              ></textarea>
            </div>

            <button
              type="submit"
              class="w-full py-3.5 rounded-xl bg-agrobamba-forest hover:bg-agrobamba-forest-light text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 group"
            >
              <Send class="w-4 h-4 text-agrobamba-amber group-hover:translate-x-0.5 transition-transform" />
              <span>Enviar Cotización al Equipo Agrobamba</span>
            </button>

            <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
              <div v-if="formSubmitted" class="p-4 rounded-xl bg-agrobamba-emerald/15 border border-agrobamba-emerald/30 text-agrobamba-emerald text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 class="w-5 h-5 text-agrobamba-emerald shrink-0" />
                <span>¡Gracias! Su requerimiento ha sido registrado en el estado reactivo del componente.</span>
              </div>
            </transition>

          </form>

        </div>

      </div>

    </div>
  </section>
</template>
