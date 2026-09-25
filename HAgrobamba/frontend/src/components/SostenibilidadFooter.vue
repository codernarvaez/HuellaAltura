<script setup>
import { ref, reactive } from 'vue'
import { 
  Leaf, 
  TreePine, 
  ShieldCheck, 
  HeartHandshake, 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Sprout,
  ArrowUpRight
} from 'lucide-vue-next'

const contactSubmitted = ref(false)

const contactForm = reactive({
  name: '',
  email: '',
  subject: '',
  message: ''
})

const handleContactSubmit = () => {
  if (!contactForm.name || !contactForm.email) return
  contactSubmitted.value = true
  setTimeout(() => {
    contactSubmitted.value = false
    contactForm.name = ''
    contactForm.email = ''
    contactForm.subject = ''
    contactForm.message = ''
  }, 4000)
}
</script>

<template>
  <footer id="sostenibilidad" class="bg-agrobamba-forest-dark text-white relative pt-20 pb-12 overflow-hidden border-t border-agrobamba-border/20">
    
    <!-- Background Accents -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-agrobamba-emerald/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      <!-- Sustainability Banner Grid -->
      <div class="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-agrobamba-forest via-agrobamba-forest-light to-agrobamba-coffee/80 border border-white/10 shadow-2xl mb-16 space-y-8">
        
        <div class="text-center max-w-3xl mx-auto space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-agrobamba-amber/20 border border-agrobamba-amber/30 text-agrobamba-amber text-xs font-mono font-semibold uppercase">
            <TreePine class="w-3.5 h-3.5" />
            <span>COMPROMISO SOCIO-AMBIENTAL</span>
          </div>
          <h3 class="font-serif text-3xl sm:text-4xl font-bold text-white">
            Sostenibilidad que Protege la Cordillera Andina
          </h3>
          <p class="text-sm sm:text-base text-white/80 font-sans">
            Garantizamos la preservación de micro-cuencas, la cero deforestación bajo estándar EUDR y un trato justo y digno para las familias caficultoras del sur del Ecuador.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-white/10">
          <div class="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <ShieldCheck class="w-8 h-8 text-agrobamba-amber shrink-0" />
            <div>
              <h4 class="font-serif font-bold text-base text-white">Deforestación Cero (EUDR)</h4>
              <p class="text-xs text-white/70 mt-1">Monitoreo satelital continuo de parcelas mediante imágenes Sentinel-2.</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <Leaf class="w-8 h-8 text-agrobamba-amber shrink-0" />
            <div>
              <h4 class="font-serif font-bold text-base text-white">Biotecnología Limpia</h4>
              <p class="text-xs text-white/70 mt-1">Sustitución de agroquímicos sintéticos por bio-insumos orgánicos producidos in-situ.</p>
            </div>
          </div>

          <div class="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <HeartHandshake class="w-8 h-8 text-agrobamba-amber shrink-0" />
            <div>
              <h4 class="font-serif font-bold text-base text-white">Comercio Justo Directo</h4>
              <p class="text-xs text-white/70 mt-1">Pago de primas superiores al precio internacional para sostener la agricultura familiar.</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Contact Form & Company Details Grid -->
      <div id="contacto" class="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16 border-b border-white/10">
        
        <!-- Left Company Info -->
        <div class="lg:col-span-5 space-y-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-agrobamba-amber flex items-center justify-center text-agrobamba-forest font-bold">
              <Sprout class="w-6 h-6" />
            </div>
            <div>
              <span class="font-serif text-2xl font-bold text-white block">AGROBAMBA CIA. LTDA.</span>
              <span class="text-xs font-mono uppercase text-agrobamba-amber-light">Loja &bull; Ecuador</span>
            </div>
          </div>

          <p class="text-sm text-white/75 leading-relaxed font-sans">
            Oficinas centrales y laboratorios de biotecnología ubicados en la provincia de Loja. Atendemos consultas de exportación, asesoría técnica y venta directa.
          </p>

          <div class="space-y-3 pt-2 text-sm text-white/80">
            <div class="flex items-center gap-3">
              <MapPin class="w-5 h-5 text-agrobamba-amber shrink-0" />
              <span>Av. Orillas del Zamora & Vilcabamba, Loja, Ecuador</span>
            </div>
            <div class="flex items-center gap-3">
              <Mail class="w-5 h-5 text-agrobamba-amber shrink-0" />
              <a href="mailto:info@agrobamba.com.ec" class="hover:text-agrobamba-amber transition-colors">info@agrobamba.com.ec</a>
            </div>
            <div class="flex items-center gap-3">
              <Phone class="w-5 h-5 text-agrobamba-amber shrink-0" />
              <a href="tel:+593991234567" class="hover:text-agrobamba-amber transition-colors">+593 (07) 258-9000 / +593 99 123 4567</a>
            </div>
          </div>

          <!-- Direct WhatsApp Button -->
          <a
            href="https://wa.me/593991234567?text=Hola%20Agrobamba,%20deseo%20m%C3%A1s%20informaci%C3%B3n"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-agrobamba-emerald hover:bg-agrobamba-emerald/90 text-white font-semibold text-sm transition-all shadow-md group"
          >
            <span>Contactar por WhatsApp Directo</span>
            <ArrowUpRight class="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        <!-- Right Quick Contact Form -->
        <div class="lg:col-span-7 bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/10 space-y-4">
          <h4 class="font-serif text-2xl font-bold text-white">Formulario de Contacto Directo</h4>
          <p class="text-xs text-white/70">Envía un mensaje rápido a nuestro equipo agronómico y comercial.</p>

          <form @submit.prevent="handleContactSubmit" class="space-y-4 pt-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                v-model="contactForm.name"
                type="text"
                required
                placeholder="Tu Nombre"
                class="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:border-agrobamba-amber"
              />
              <input
                v-model="contactForm.email"
                type="email"
                required
                placeholder="Tu Correo Electrónico"
                class="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:border-agrobamba-amber"
              />
            </div>

            <input
              v-model="contactForm.subject"
              type="text"
              placeholder="Asunto (ej. Cotización Café Verde / Visita a Finca)"
              class="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:border-agrobamba-amber"
            />

            <textarea
              v-model="contactForm.message"
              rows="3"
              placeholder="Escribe tu mensaje o consulta..."
              class="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/15 text-sm text-white placeholder-white/40 focus:outline-none focus:border-agrobamba-amber"
            ></textarea>

            <button
              type="submit"
              class="w-full py-3 rounded-xl bg-agrobamba-amber hover:bg-agrobamba-amber/90 text-agrobamba-forest-dark font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Send class="w-4 h-4" />
              <span>Enviar Mensaje</span>
            </button>

            <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
              <div v-if="contactSubmitted" class="p-3 rounded-xl bg-agrobamba-emerald/20 border border-agrobamba-emerald text-agrobamba-amber text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 text-agrobamba-emerald shrink-0" />
                <span>Mensaje recibido correctamente. Nos pondremos en contacto pronto.</span>
              </div>
            </transition>
          </form>
        </div>

      </div>

      <!-- Copyright & Bottom Links -->
      <div class="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 space-y-4 sm:space-y-0">
        <p>&copy; 2026 Agrobamba Cia. Ltda. Todos los derechos reservados. Loja, Ecuador.</p>
        <div class="flex items-center gap-6">
          <a href="#" class="hover:text-agrobamba-amber transition-colors">Política de Privacidad</a>
          <a href="#" class="hover:text-agrobamba-amber transition-colors">Términos B2B</a>
          <a href="#" class="hover:text-agrobamba-amber transition-colors">Certificación Satelital</a>
        </div>
      </div>

    </div>
  </footer>
</template>
