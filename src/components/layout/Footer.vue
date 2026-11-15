<script setup>
const year = new Date().getFullYear()

// Update these with the business's real details/handles before launch.
const contact = {
  email: 'info@flairplace.com',
  phone: '+254 7160 634 972',
}

const socials = [
  { name: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61596585238402', icon: 'facebook' },
  { name: 'Instagram', href: 'https://www.instagram.com/flairplace.254/', icon: 'instagram' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@flairplace', icon: 'tiktok' },
  { name: 'X', href: 'https://x.com/flair_place_ke', icon: 'x' },
]
</script>

<template>
  <footer class="bg-slate-900 dark:bg-neutral-900 pt-12 pb-6 sm:pt-16 sm:pb-8 px-4 sm:px-6 lg:px-8">
   <div class="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-10 sm:gap-y-12 gap-x-6 sm:gap-x-8">
      <div class="space-y-4 sm:space-y-6 min-w-0">
         <h3 class="text-sm text-slate-50 font-semibold">Contact us</h3>
         <ul class="space-y-4 text-sm text-slate-400 font-normal">
            <li>
               <a :href="`mailto:${contact.email}`" class="inline-flex max-w-full items-center gap-2 break-all hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 rounded transition-all">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-600 text-white">
                     <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.7" />
                        <path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                     </svg>
                  </span>
                  {{ contact.email }}
               </a>
            </li>
            <li>
               <a :href="`tel:${contact.phone.replace(/\s/g, '')}`" class="inline-flex items-center gap-2 hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 rounded transition-all">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-600 text-white">
                     <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4" aria-hidden="true">
                        <path d="M7.2 3.5H5a1.5 1.5 0 0 0-1.5 1.6c.7 8.1 7.2 14.6 15.3 15.4a1.5 1.5 0 0 0 1.7-1.5v-2.3a1.5 1.5 0 0 0-1.2-1.5l-3.1-.6a1.5 1.5 0 0 0-1.4.4l-1.4 1.4a16 16 0 0 1-6.3-6.3l1.4-1.4a1.5 1.5 0 0 0 .4-1.4l-.6-3.1a1.5 1.5 0 0 0-1.1-1.2Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                     </svg>
                  </span>
                  {{ contact.phone }}
               </a>
            </li>
          
         </ul>
      </div>

      <div class="space-y-4 sm:space-y-6 min-w-0">
         <h3 class="text-sm text-slate-50 font-semibold">Helpful Links</h3>
         <ul class="space-y-4 text-sm text-slate-400 font-normal">
            
            <li><RouterLink to="/providers" class="hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 rounded transition-all">Providers</RouterLink></li>
            <li><RouterLink to="/about" class="hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 rounded transition-all">About Us</RouterLink></li>
            <li><RouterLink to="/contact" class="hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 rounded transition-all">Contact Us</RouterLink></li>
           
         </ul>
      </div>

      <div class="space-y-4 sm:space-y-6 min-w-0">
         <h3 class="text-sm text-slate-50 font-semibold">Policies</h3>
         <ul class="space-y-4 text-sm text-slate-400 font-normal">
            <li><RouterLink to="/privacy"
                  class="hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 rounded transition-all">Privacy Policy</RouterLink></li>
            <li><RouterLink to="/terms"
                  class="hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 rounded transition-all">Terms
                  &amp; Conditions</RouterLink></li>
            
         </ul>
      </div>

      <div class="space-y-4 sm:space-y-6 min-w-0">
         <h3 class="text-sm text-slate-50 font-semibold">Social Media</h3>
         <ul class="flex flex-wrap gap-4 sm:gap-6">
            <li v-for="social in socials" :key="social.name">
               <a :href="social.href" target="_blank" rel="noopener noreferrer"
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-clay-600 p-2 text-slate-50 transition hover:bg-clay-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400"
                  :aria-label="`Flairplace on ${social.name}`" :title="social.name">
                  <!-- Facebook -->
                  <svg v-if="social.icon === 'facebook'" class="size-full fill-current" viewBox="0 0 155.139 155.139" aria-hidden="true">
                     <path d="M89.584 155.139V84.378h23.742l3.562-27.585H89.584V39.184c0-7.984 2.208-13.425 13.67-13.425l14.595-.006V1.08C115.325.752 106.661 0 96.577 0 75.52 0 61.104 12.853 61.104 36.452v20.341H37.29v27.585h23.814v70.761z" />
                  </svg>
                  <!-- Instagram -->
                  <svg v-else-if="social.icon === 'instagram'" class="size-full" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                     <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2.2" />
                     <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="2.2" />
                     <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
                  </svg>
                  <!-- TikTok -->
                  <svg v-else-if="social.icon === 'tiktok'" class="size-full fill-current" viewBox="0 0 24 24" aria-hidden="true">
                     <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
                  </svg>
                  <!-- X -->
                  <svg v-else-if="social.icon === 'x'" class="size-full fill-current" viewBox="0 0 1226.37 1226.37" aria-hidden="true">
                     <path d="M727.348 519.284 1174.075 0h-105.86L680.322 450.887 370.513 0H13.185l468.492 681.821L13.185 1226.37h105.866l409.625-476.152 327.181 476.152h357.328L727.322 519.284zM582.35 687.828l-47.468-67.894-377.686-540.24H319.8l304.797 435.991 47.468 67.894 396.2 566.721H905.661L582.35 687.854z" />
                  </svg>
               </a>
            </li>
         </ul>

         <div class="mt-6! sm:mt-8!">
            <h6 class="text-sm text-slate-400">Get exclusive assets sent straight to your inbox</h6>
            <div class="mt-4 sm:mt-6">
               <RouterLink to="/register"
                  class="inline-block cursor-pointer rounded-md border border-clay-600 bg-clay-600 px-3.5 py-2 text-sm font-semibold tracking-wide text-white transition-all hover:border-clay-700 hover:bg-clay-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">Sign
                  up</RouterLink>
            </div>
         </div>
      </div>
   </div>

   <hr class="max-w-7xl mx-auto my-6 sm:my-8 border-neutral-700" />

   <div class="max-w-7xl mx-auto text-center">
      <p class="text-slate-400 text-sm">
         © {{ year }} Flairplace. All rights reserved.
      </p>
   </div>
</footer>
</template>
