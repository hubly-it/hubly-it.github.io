<!-- App.svelte -->
<script>
	import { Router, Route } from "svelte-routing";
	import Index from "./views/Index.svelte";
	export let url = "";
  </script>
  
  <Router url="{url}">
	<Route path="/" component="{Index}" />
  </Router>
  