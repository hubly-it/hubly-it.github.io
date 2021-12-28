<script>
  import { link } from "svelte-routing";

  // core components
  // import IndexDropdown from "components/Dropdowns/IndexDropdown.svelte";

  let navbarOpen = false;
  const logo = "../../assets/img/logo-hubly.png";

  function setNavbarOpen() {
    navbarOpen = !navbarOpen;
  }
</script>

<nav
  class="top-0 fixed z-50 w-full flex flex-wrap items-center justify-between px-2 py-3 navbar-expand-lg bg-white shadow"
>
  <div
    class="container px-4 mx-auto flex flex-wrap items-center justify-between"
  >
    <div
      class="w-full relative flex justify-between items-center lg:w-auto lg:static lg:block lg:justify-start"
    >
      <a
        use:link
        class="text-blueGray-700 text-sm font-bold leading-relaxed inline-block mr-4 py-2 whitespace-nowrap uppercase"
        href="/"
      >
        hubly
      </a>
      <button
        class="cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block lg:hidden outline-none focus:outline-none"
        type="button"
        on:click="{setNavbarOpen}"
      >
        <i class="fas fa-bars"></i>
      </button>
    </div>
    <div
      class="lg:flex flex-grow items-center {navbarOpen ? 'block':'hidden'}"
      id="example-navbar-warning"
    >
      <ul class="flex flex-col lg:flex-row list-none mr-auto">
      </ul>
      <ul class="flex flex-col lg:flex-row list-none lg:ml-auto">
        <!-- <li class="flex items-center">
          <IndexDropdown />
        </li> -->

        <li class="flex items-center">
          <a
            class="hover:text-blueGray-500 text-blueGray-700 px-3 py-2 flex items-center text-xs uppercase font-bold"
            href="https://github.com/hubly-it"
            target="_blank"
          >
            <i class="text-blueGray-400 fab fa-github text-lg leading-lg" />
            <span class="lg:hidden inline-block ml-2">Star</span>
          </a>
        </li>

        <li class="flex items-center">
          <button
            class="bg-red-400 text-white active:bg-red-500 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none lg:mr-1 lg:mb-0 ml-3 mb-3 ease-linear transition-all duration-150"
            type="button"
            onclick="window.location.href='https://forms.gle/GtxDnSLuJFhmkoRJA'"
          >
          <i class="fas fa-envelope"></i> Contact us
          </button>
        </li>
      </ul>
    </div>
  </div>
</nav>
