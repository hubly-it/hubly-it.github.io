
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.3' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    function hostMatches(anchor) {
      const host = location.host;
      return (
        anchor.host == host ||
        // svelte seems to kill anchor.host value in ie11, so fall back to checking href
        anchor.href.indexOf(`https://${host}`) === 0 ||
        anchor.href.indexOf(`http://${host}`) === 0
      )
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.44.3 */

    function create_fragment$5(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $location;
    	let $routes;
    	let $base;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, ['default']);
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, 'routes');
    	component_subscribe($$self, routes, value => $$invalidate(6, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(5, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, 'base');
    	component_subscribe($$self, base, value => $$invalidate(7, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ['basepath', 'url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$location,
    		$routes,
    		$base
    	});

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(4, url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 128) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			{
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 96) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		$location,
    		$routes,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.44.3 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 4,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[2],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, routeParams, $location*/ 532)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[9],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[2],
    		/*routeProps*/ ctx[3]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 28)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Route', slots, ['default']);
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('path' in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate(8, path = $$new_props.path);
    		if ('component' in $$props) $$invalidate(0, component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate(2, routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate(3, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 2) {
    			if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(2, routeParams = $activeRoute.params);
    			}
    		}

    		{
    			const { path, component, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * A link action that can be added to <a href=""> tags rather
     * than using the <Link> component.
     *
     * Example:
     * ```html
     * <a href="/post/{postId}" use:link>{post.title}</a>
     * ```
     */
    function link(node) {
      function onClick(event) {
        const anchor = event.currentTarget;

        if (
          anchor.target === "" &&
          hostMatches(anchor) &&
          shouldNavigate(event)
        ) {
          event.preventDefault();
          navigate(anchor.pathname + anchor.search, { replace: anchor.hasAttribute("replace") });
        }
      }

      node.addEventListener("click", onClick);

      return {
        destroy() {
          node.removeEventListener("click", onClick);
        }
      };
    }

    /* src/components/IndexNavbar.svelte generated by Svelte v3.44.3 */
    const file$2 = "src/components/IndexNavbar.svelte";

    function create_fragment$3(ctx) {
    	let nav;
    	let div2;
    	let div0;
    	let a0;
    	let t1;
    	let button0;
    	let i0;
    	let t2;
    	let div1;
    	let ul0;
    	let t3;
    	let ul1;
    	let li0;
    	let a1;
    	let i1;
    	let t4;
    	let span;
    	let t6;
    	let li1;
    	let button1;
    	let i2;
    	let t7;
    	let div1_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div2 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			a0.textContent = "hubly";
    			t1 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t2 = space();
    			div1 = element("div");
    			ul0 = element("ul");
    			t3 = space();
    			ul1 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t4 = space();
    			span = element("span");
    			span.textContent = "Star";
    			t6 = space();
    			li1 = element("li");
    			button1 = element("button");
    			i2 = element("i");
    			t7 = text(" Contact us");
    			attr_dev(a0, "class", "text-blueGray-700 text-sm font-bold leading-relaxed inline-block mr-4 py-2 whitespace-nowrap uppercase");
    			attr_dev(a0, "href", "/");
    			add_location(a0, file$2, 23, 6, 649);
    			attr_dev(i0, "class", "fas fa-bars");
    			add_location(i0, file$2, 35, 8, 1097);
    			attr_dev(button0, "class", "cursor-pointer text-xl leading-none px-3 py-1 border border-solid border-transparent rounded bg-transparent block lg:hidden outline-none focus:outline-none");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$2, 30, 6, 844);
    			attr_dev(div0, "class", "w-full relative flex justify-between items-center lg:w-auto lg:static lg:block lg:justify-start");
    			add_location(div0, file$2, 20, 4, 522);
    			attr_dev(ul0, "class", "flex flex-col lg:flex-row list-none mr-auto");
    			add_location(ul0, file$2, 42, 6, 1284);
    			attr_dev(i1, "class", "text-blueGray-400 fab fa-github text-lg leading-lg");
    			add_location(i1, file$2, 55, 12, 1779);
    			attr_dev(span, "class", "lg:hidden inline-block ml-2");
    			add_location(span, file$2, 56, 12, 1856);
    			attr_dev(a1, "class", "hover:text-blueGray-500 text-blueGray-700 px-3 py-2 flex items-center text-xs uppercase font-bold");
    			attr_dev(a1, "href", "https://github.com/hubly-it");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$2, 50, 10, 1559);
    			attr_dev(li0, "class", "flex items-center");
    			add_location(li0, file$2, 49, 8, 1518);
    			attr_dev(i2, "class", "fas fa-envelope");
    			add_location(i2, file$2, 66, 10, 2353);
    			attr_dev(button1, "class", "bg-red-400 text-white active:bg-red-500 text-xs font-bold uppercase px-4 py-2 rounded shadow hover:shadow-lg outline-none focus:outline-none lg:mr-1 lg:mb-0 ml-3 mb-3 ease-linear transition-all duration-150");
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "onclick", "window.location.href='https://forms.gle/GtxDnSLuJFhmkoRJA'");
    			add_location(button1, file$2, 61, 10, 1989);
    			attr_dev(li1, "class", "flex items-center");
    			add_location(li1, file$2, 60, 8, 1948);
    			attr_dev(ul1, "class", "flex flex-col lg:flex-row list-none lg:ml-auto");
    			add_location(ul1, file$2, 44, 6, 1359);
    			attr_dev(div1, "class", div1_class_value = "lg:flex flex-grow items-center " + (/*navbarOpen*/ ctx[0] ? 'block' : 'hidden'));
    			attr_dev(div1, "id", "example-navbar-warning");
    			add_location(div1, file$2, 38, 4, 1156);
    			attr_dev(div2, "class", "container px-4 mx-auto flex flex-wrap items-center justify-between");
    			add_location(div2, file$2, 17, 2, 430);
    			attr_dev(nav, "class", "top-0 fixed z-50 w-full flex flex-wrap items-center justify-between px-2 py-3 navbar-expand-lg bg-white shadow");
    			add_location(nav, file$2, 14, 0, 300);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div2);
    			append_dev(div2, div0);
    			append_dev(div0, a0);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, ul0);
    			append_dev(div1, t3);
    			append_dev(div1, ul1);
    			append_dev(ul1, li0);
    			append_dev(li0, a1);
    			append_dev(a1, i1);
    			append_dev(a1, t4);
    			append_dev(a1, span);
    			append_dev(ul1, t6);
    			append_dev(ul1, li1);
    			append_dev(li1, button1);
    			append_dev(button1, i2);
    			append_dev(button1, t7);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(link.call(null, a0)),
    					listen_dev(button0, "click", /*setNavbarOpen*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*navbarOpen*/ 1 && div1_class_value !== (div1_class_value = "lg:flex flex-grow items-center " + (/*navbarOpen*/ ctx[0] ? 'block' : 'hidden'))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const logo = "../../assets/img/logo-hubly.png";

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('IndexNavbar', slots, []);
    	let navbarOpen = false;

    	function setNavbarOpen() {
    		$$invalidate(0, navbarOpen = !navbarOpen);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<IndexNavbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link, navbarOpen, logo, setNavbarOpen });

    	$$self.$inject_state = $$props => {
    		if ('navbarOpen' in $$props) $$invalidate(0, navbarOpen = $$props.navbarOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [navbarOpen, setNavbarOpen];
    }

    class IndexNavbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "IndexNavbar",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.44.3 */

    const file$1 = "src/components/Footer.svelte";

    function create_fragment$2(ctx) {
    	let footer;
    	let div0;
    	let svg;
    	let polygon;
    	let t0;
    	let div7;
    	let div3;
    	let div2;
    	let h4;
    	let t2;
    	let h5;
    	let t4;
    	let div1;
    	let a0;
    	let button0;
    	let i0;
    	let t5;
    	let a1;
    	let button1;
    	let i1;
    	let t6;
    	let hr;
    	let t7;
    	let div6;
    	let div5;
    	let div4;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div0 = element("div");
    			svg = svg_element("svg");
    			polygon = svg_element("polygon");
    			t0 = space();
    			div7 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Let's keep in touch!";
    			t2 = space();
    			h5 = element("h5");
    			h5.textContent = "Find us on any of these platforms, we respond 1-2 business days.";
    			t4 = space();
    			div1 = element("div");
    			a0 = element("a");
    			button0 = element("button");
    			i0 = element("i");
    			t5 = space();
    			a1 = element("a");
    			button1 = element("button");
    			i1 = element("i");
    			t6 = space();
    			hr = element("hr");
    			t7 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = `Copyright © ${/*date*/ ctx[0]} Hubly.`;
    			attr_dev(polygon, "class", "text-blueGray-200 fill-current");
    			attr_dev(polygon, "points", "2560 0 2560 100 0 100");
    			add_location(polygon, file$1, 19, 6, 530);
    			attr_dev(svg, "class", "absolute bottom-0 overflow-hidden");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "preserveAspectRatio", "none");
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "viewBox", "0 0 2560 100");
    			attr_dev(svg, "x", "0");
    			attr_dev(svg, "y", "0");
    			add_location(svg, file$1, 10, 4, 318);
    			attr_dev(div0, "class", "bottom-auto top-0 left-0 right-0 w-full absolute pointer-events-none overflow-hidden -mt-20 h-20");
    			set_style(div0, "transform", "translateZ(0)");
    			add_location(div0, file$1, 6, 2, 158);
    			attr_dev(h4, "class", "text-3xl font-semibold");
    			add_location(h4, file$1, 28, 8, 810);
    			attr_dev(h5, "class", "text-lg mt-0 mb-2 text-blueGray-600");
    			add_location(h5, file$1, 29, 8, 879);
    			attr_dev(i0, "class", "fas fa-envelope");
    			add_location(i0, file$1, 50, 14, 1970);
    			attr_dev(button0, "class", "bg-white text-red-400 shadow-lg font-normal h-10 w-10 items-center justify-center align-center rounded-full outline-none focus:outline-none mr-2");
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$1, 46, 12, 1739);
    			attr_dev(a0, "href", "https://forms.gle/HbYt7f859og5k7599");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file$1, 45, 10, 1664);
    			attr_dev(i1, "class", "fab fa-github");
    			add_location(i1, file$1, 58, 14, 2352);
    			attr_dev(button1, "class", "bg-white text-blueGray-800 shadow-lg font-normal h-10 w-10 items-center justify-center align-center rounded-full outline-none focus:outline-none mr-2");
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$1, 54, 12, 2116);
    			attr_dev(a1, "href", "https://github.com/hubly-it");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$1, 53, 10, 2049);
    			attr_dev(div1, "class", "mt-6 lg:mb-0 mb-6");
    			add_location(div1, file$1, 32, 8, 1025);
    			attr_dev(div2, "class", "w-full lg:w-6/12 px-4");
    			add_location(div2, file$1, 27, 6, 766);
    			attr_dev(div3, "class", "flex flex-wrap text-center lg:text-left");
    			add_location(div3, file$1, 26, 4, 706);
    			attr_dev(hr, "class", "my-6 border-blueGray-300");
    			add_location(hr, file$1, 150, 4, 5639);
    			attr_dev(div4, "class", "text-sm text-blueGray-500 font-semibold py-1");
    			add_location(div4, file$1, 153, 8, 5829);
    			attr_dev(div5, "class", "w-full md:w-4/12 px-4 mx-auto text-center");
    			add_location(div5, file$1, 152, 6, 5765);
    			attr_dev(div6, "class", "flex flex-wrap items-center md:justify-between justify-center");
    			add_location(div6, file$1, 151, 4, 5683);
    			attr_dev(div7, "class", "container mx-auto px-4");
    			add_location(div7, file$1, 25, 2, 665);
    			attr_dev(footer, "class", "relative bg-blueGray-200 pt-8 pb-6");
    			add_location(footer, file$1, 5, 0, 104);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div0);
    			append_dev(div0, svg);
    			append_dev(svg, polygon);
    			append_dev(footer, t0);
    			append_dev(footer, div7);
    			append_dev(div7, div3);
    			append_dev(div3, div2);
    			append_dev(div2, h4);
    			append_dev(div2, t2);
    			append_dev(div2, h5);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, a0);
    			append_dev(a0, button0);
    			append_dev(button0, i0);
    			append_dev(div1, t5);
    			append_dev(div1, a1);
    			append_dev(a1, button1);
    			append_dev(button1, i1);
    			append_dev(div7, t6);
    			append_dev(div7, hr);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	let date = new Date().getFullYear();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ date });

    	$$self.$inject_state = $$props => {
    		if ('date' in $$props) $$invalidate(0, date = $$props.date);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [date];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/views/Index.svelte generated by Svelte v3.44.3 */
    const file = "src/views/Index.svelte";

    function create_fragment$1(ctx) {
    	let indexnavbar;
    	let t0;
    	let section0;
    	let div3;
    	let div2;
    	let div1;
    	let h2;
    	let t2;
    	let p0;
    	let t4;
    	let div0;
    	let a0;
    	let t6;
    	let a1;
    	let t8;
    	let img0;
    	let img0_src_value;
    	let t9;
    	let section1;
    	let div4;
    	let svg0;
    	let polygon0;
    	let t10;
    	let div24;
    	let div23;
    	let div6;
    	let div5;
    	let img1;
    	let img1_src_value;
    	let t11;
    	let blockquote;
    	let svg1;
    	let polygon1;
    	let t12;
    	let h4;
    	let t14;
    	let p1;
    	let t16;
    	let div22;
    	let div21;
    	let div13;
    	let div9;
    	let div8;
    	let div7;
    	let i0;
    	let t17;
    	let h60;
    	let t19;
    	let p2;
    	let t21;
    	let div12;
    	let div11;
    	let div10;
    	let i1;
    	let t22;
    	let h61;
    	let t24;
    	let p3;
    	let t26;
    	let div20;
    	let div16;
    	let div15;
    	let div14;
    	let i2;
    	let t27;
    	let h62;
    	let t29;
    	let p4;
    	let t31;
    	let div19;
    	let div18;
    	let div17;
    	let i3;
    	let t32;
    	let h63;
    	let t34;
    	let p5;
    	let t36;
    	let div45;
    	let div30;
    	let div27;
    	let div25;
    	let i4;
    	let t37;
    	let h30;
    	let t39;
    	let p6;
    	let t41;
    	let div26;
    	let span0;
    	let t43;
    	let span1;
    	let t45;
    	let span2;
    	let t47;
    	let span3;
    	let t49;
    	let span4;
    	let t51;
    	let span5;
    	let t53;
    	let span6;
    	let t55;
    	let span7;
    	let t57;
    	let a2;
    	let t58;
    	let i5;
    	let t59;
    	let div29;
    	let div28;
    	let img2;
    	let img2_src_value;
    	let t60;
    	let img3;
    	let img3_src_value;
    	let t61;
    	let img4;
    	let img4_src_value;
    	let t62;
    	let img5;
    	let img5_src_value;
    	let t63;
    	let img6;
    	let img6_src_value;
    	let t64;
    	let img7;
    	let img7_src_value;
    	let t65;
    	let div44;
    	let div40;
    	let div39;
    	let div34;
    	let div31;
    	let img8;
    	let img8_src_value;
    	let t66;
    	let p7;
    	let t68;
    	let div32;
    	let img9;
    	let img9_src_value;
    	let t69;
    	let p8;
    	let t71;
    	let div33;
    	let img10;
    	let img10_src_value;
    	let t72;
    	let p9;
    	let t74;
    	let div38;
    	let div35;
    	let img11;
    	let img11_src_value;
    	let t75;
    	let p10;
    	let t77;
    	let div36;
    	let img12;
    	let img12_src_value;
    	let t78;
    	let p11;
    	let t80;
    	let div37;
    	let img13;
    	let img13_src_value;
    	let t81;
    	let p12;
    	let t83;
    	let div43;
    	let div41;
    	let i6;
    	let t84;
    	let h31;
    	let t86;
    	let p13;
    	let t88;
    	let p14;
    	let t90;
    	let div42;
    	let span8;
    	let t92;
    	let span9;
    	let t94;
    	let span10;
    	let t96;
    	let span11;
    	let t98;
    	let span12;
    	let t100;
    	let span13;
    	let t102;
    	let span14;
    	let t104;
    	let span15;
    	let t106;
    	let a3;
    	let t107;
    	let i7;
    	let t108;
    	let section2;
    	let div50;
    	let div49;
    	let div47;
    	let div46;
    	let i8;
    	let t109;
    	let h32;
    	let t111;
    	let p15;
    	let t113;
    	let a4;
    	let t115;
    	let div48;
    	let i9;
    	let t116;
    	let section3;
    	let div51;
    	let svg2;
    	let polygon2;
    	let t117;
    	let footer;
    	let current;
    	indexnavbar = new IndexNavbar({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(indexnavbar.$$.fragment);
    			t0 = space();
    			section0 = element("section");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Hubly - Solutions for your business.";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "We offer advice and solutions for your business. We translate our passion into code.";
    			t4 = space();
    			div0 = element("div");
    			a0 = element("a");
    			a0.textContent = "Contact us";
    			t6 = space();
    			a1 = element("a");
    			a1.textContent = "Github Star";
    			t8 = space();
    			img0 = element("img");
    			t9 = space();
    			section1 = element("section");
    			div4 = element("div");
    			svg0 = svg_element("svg");
    			polygon0 = svg_element("polygon");
    			t10 = space();
    			div24 = element("div");
    			div23 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			img1 = element("img");
    			t11 = space();
    			blockquote = element("blockquote");
    			svg1 = svg_element("svg");
    			polygon1 = svg_element("polygon");
    			t12 = space();
    			h4 = element("h4");
    			h4.textContent = "Great for your awesome project";
    			t14 = space();
    			p1 = element("p");
    			p1.textContent = "Putting together a page has never been easier than matching\n\t\t\t\ttogether pre-made components. From landing pages presentation to\n\t\t\t\tlogin areas, you can easily customise and built your pages.";
    			t16 = space();
    			div22 = element("div");
    			div21 = element("div");
    			div13 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			i0 = element("i");
    			t17 = space();
    			h60 = element("h6");
    			h60.textContent = "CSS Components";
    			t19 = space();
    			p2 = element("p");
    			p2.textContent = "Hubly comes with a huge number of Fully Coded CSS\n\t\t\t\t\tcomponents.";
    			t21 = space();
    			div12 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			i1 = element("i");
    			t22 = space();
    			h61 = element("h6");
    			h61.textContent = "JavaScript Components";
    			t24 = space();
    			p3 = element("p");
    			p3.textContent = "We also feature many dynamic components for React, NextJS, Vue\n\t\t\t\t\tand Angular.";
    			t26 = space();
    			div20 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			div14 = element("div");
    			i2 = element("i");
    			t27 = space();
    			h62 = element("h6");
    			h62.textContent = "Hubspot Components";
    			t29 = space();
    			p4 = element("p");
    			p4.textContent = "Thanks to our experience on Hubspot we can offer custom ready-to-use solutions.";
    			t31 = space();
    			div19 = element("div");
    			div18 = element("div");
    			div17 = element("div");
    			i3 = element("i");
    			t32 = space();
    			h63 = element("h6");
    			h63.textContent = "Documentation";
    			t34 = space();
    			p5 = element("p");
    			p5.textContent = "Built by developers for developers. You will love how easy is\n\t\t\t\t\tto to work with Hubly.";
    			t36 = space();
    			div45 = element("div");
    			div30 = element("div");
    			div27 = element("div");
    			div25 = element("div");
    			i4 = element("i");
    			t37 = space();
    			h30 = element("h3");
    			h30.textContent = "Hubspot Components";
    			t39 = space();
    			p6 = element("p");
    			p6.textContent = "Every element that you need in a product comes built in as a\n\t\t\tcomponent. All components fit perfectly with each other and can have\n\t\t\tdifferent colours.";
    			t41 = space();
    			div26 = element("div");
    			span0 = element("span");
    			span0.textContent = "Buttons";
    			t43 = space();
    			span1 = element("span");
    			span1.textContent = "Inputs";
    			t45 = space();
    			span2 = element("span");
    			span2.textContent = "Labels";
    			t47 = space();
    			span3 = element("span");
    			span3.textContent = "Menus";
    			t49 = space();
    			span4 = element("span");
    			span4.textContent = "Navbars";
    			t51 = space();
    			span5 = element("span");
    			span5.textContent = "Pagination";
    			t53 = space();
    			span6 = element("span");
    			span6.textContent = "Progressbars";
    			t55 = space();
    			span7 = element("span");
    			span7.textContent = "Typography";
    			t57 = space();
    			a2 = element("a");
    			t58 = text("View All\n\t\t\t");
    			i5 = element("i");
    			t59 = space();
    			div29 = element("div");
    			div28 = element("div");
    			img2 = element("img");
    			t60 = space();
    			img3 = element("img");
    			t61 = space();
    			img4 = element("img");
    			t62 = space();
    			img5 = element("img");
    			t63 = space();
    			img6 = element("img");
    			t64 = space();
    			img7 = element("img");
    			t65 = space();
    			div44 = element("div");
    			div40 = element("div");
    			div39 = element("div");
    			div34 = element("div");
    			div31 = element("div");
    			img8 = element("img");
    			t66 = space();
    			p7 = element("p");
    			p7.textContent = "Svelte";
    			t68 = space();
    			div32 = element("div");
    			img9 = element("img");
    			t69 = space();
    			p8 = element("p");
    			p8.textContent = "ReactJS";
    			t71 = space();
    			div33 = element("div");
    			img10 = element("img");
    			t72 = space();
    			p9 = element("p");
    			p9.textContent = "NextJS";
    			t74 = space();
    			div38 = element("div");
    			div35 = element("div");
    			img11 = element("img");
    			t75 = space();
    			p10 = element("p");
    			p10.textContent = "JavaScript";
    			t77 = space();
    			div36 = element("div");
    			img12 = element("img");
    			t78 = space();
    			p11 = element("p");
    			p11.textContent = "Angular";
    			t80 = space();
    			div37 = element("div");
    			img13 = element("img");
    			t81 = space();
    			p12 = element("p");
    			p12.textContent = "Vue.js";
    			t83 = space();
    			div43 = element("div");
    			div41 = element("div");
    			i6 = element("i");
    			t84 = space();
    			h31 = element("h3");
    			h31.textContent = "Javascript Components";
    			t86 = space();
    			p13 = element("p");
    			p13.textContent = "In order to create a great User Experience some components require\n\t\t\tJavaScript. In this way you can manipulate the elements on the page\n\t\t\tand give more options to your users.";
    			t88 = space();
    			p14 = element("p");
    			p14.textContent = "We created a set of Components that are dynamic and come to help you.";
    			t90 = space();
    			div42 = element("div");
    			span8 = element("span");
    			span8.textContent = "Alerts";
    			t92 = space();
    			span9 = element("span");
    			span9.textContent = "Dropdowns";
    			t94 = space();
    			span10 = element("span");
    			span10.textContent = "Menus";
    			t96 = space();
    			span11 = element("span");
    			span11.textContent = "Modals";
    			t98 = space();
    			span12 = element("span");
    			span12.textContent = "Navbars";
    			t100 = space();
    			span13 = element("span");
    			span13.textContent = "Popovers";
    			t102 = space();
    			span14 = element("span");
    			span14.textContent = "Tabs";
    			t104 = space();
    			span15 = element("span");
    			span15.textContent = "Tooltips";
    			t106 = space();
    			a3 = element("a");
    			t107 = text("View all\n\t\t\t");
    			i7 = element("i");
    			t108 = space();
    			section2 = element("section");
    			div50 = element("div");
    			div49 = element("div");
    			div47 = element("div");
    			div46 = element("div");
    			i8 = element("i");
    			t109 = space();
    			h32 = element("h3");
    			h32.textContent = "Open Source";
    			t111 = space();
    			p15 = element("p");
    			p15.textContent = "Since we are developers, we also love open-source solutions. We actively contribute to threads on Hubspot's slack channel, check out solutions proposed by the community on the main forum... what can I say, get on board.";
    			t113 = space();
    			a4 = element("a");
    			a4.textContent = "Github";
    			t115 = space();
    			div48 = element("div");
    			i9 = element("i");
    			t116 = space();
    			section3 = element("section");
    			div51 = element("div");
    			svg2 = svg_element("svg");
    			polygon2 = svg_element("polygon");
    			t117 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(h2, "class", "font-semibold text-4xl text-blueGray-600");
    			add_location(h2, file, 22, 4, 906);
    			attr_dev(p0, "class", "mt-4 text-lg leading-relaxed text-blueGray-500");
    			add_location(p0, file, 25, 4, 1014);
    			attr_dev(a0, "href", "https://forms.gle/GtxDnSLuJFhmkoRJA");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "get-started text-white font-bold px-6 py-4 rounded outline-none focus:outline-none mr-1 mb-1 bg-red-400 active:bg-red-500 uppercase text-sm shadow hover:shadow-lg ease-linear transition-all duration-150");
    			add_location(a0, file, 29, 3, 1197);
    			attr_dev(a1, "href", "https://github.com/hubly-it/hubly-it.github.io");
    			attr_dev(a1, "class", "github-star ml-1 text-white font-bold px-6 py-4 rounded outline-none focus:outline-none mr-1 mb-1 bg-blueGray-700 active:bg-blueGray-600 uppercase text-sm shadow hover:shadow-lg ease-linear transition-all duration-150");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file, 36, 3, 1517);
    			attr_dev(div0, "class", "mt-12");
    			add_location(div0, file, 28, 4, 1174);
    			attr_dev(div1, "class", "pt-32 sm:pt-0");
    			add_location(div1, file, 21, 2, 874);
    			attr_dev(div2, "class", "w-full md:w-8/12 lg:w-6/12 xl:w-6/12 px-4");
    			add_location(div2, file, 20, 3, 816);
    			attr_dev(div3, "class", "container mx-auto items-center flex flex-wrap");
    			add_location(div3, file, 19, 1, 753);
    			attr_dev(img0, "class", "absolute top-0 b-auto right-0 pt-16 sm:w-6/12 -mt-48 sm:mt-0 w-10/12 max-h-860-px");
    			if (!src_url_equal(img0.src, img0_src_value = patternVue)) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "...");
    			add_location(img0, file, 48, 1, 1903);
    			attr_dev(section0, "class", "header relative pt-16 items-center flex h-screen max-h-860-px");
    			add_location(section0, file, 18, 2, 672);
    			attr_dev(polygon0, "class", "text-blueGray-100 fill-current");
    			attr_dev(polygon0, "points", "2560 0 2560 100 0 100");
    			add_location(polygon0, file, 69, 2, 2422);
    			attr_dev(svg0, "class", "absolute bottom-0 overflow-hidden");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "preserveAspectRatio", "none");
    			attr_dev(svg0, "version", "1.1");
    			attr_dev(svg0, "viewBox", "0 0 2560 100");
    			attr_dev(svg0, "x", "0");
    			attr_dev(svg0, "y", "0");
    			add_location(svg0, file, 60, 3, 2243);
    			attr_dev(div4, "class", "-mt-20 top-0 bottom-auto left-0 right-0 w-full absolute h-20");
    			set_style(div4, "transform", "translateZ(0)");
    			add_location(div4, file, 56, 1, 2123);
    			attr_dev(img1, "alt", "...");
    			if (!src_url_equal(img1.src, img1_src_value = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=700&q=80")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "w-full align-middle rounded-t-lg");
    			add_location(img1, file, 83, 3, 2832);
    			attr_dev(polygon1, "points", "-30,95 583,95 583,65");
    			attr_dev(polygon1, "class", "text-red-400 fill-current");
    			add_location(polygon1, file, 95, 4, 3267);
    			attr_dev(svg1, "preserveAspectRatio", "none");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 583 95");
    			attr_dev(svg1, "class", "absolute left-0 w-full block h-95-px -top-94-px");
    			add_location(svg1, file, 89, 5, 3096);
    			attr_dev(h4, "class", "text-xl font-bold text-white");
    			add_location(h4, file, 100, 5, 3385);
    			attr_dev(p1, "class", "text-md font-light mt-2 text-white");
    			add_location(p1, file, 103, 5, 3478);
    			attr_dev(blockquote, "class", "relative p-8 mb-4");
    			add_location(blockquote, file, 88, 3, 3052);
    			attr_dev(div5, "class", "relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded-lg bg-red-400");
    			add_location(div5, file, 80, 4, 2711);
    			attr_dev(div6, "class", "w-10/12 md:w-6/12 lg:w-4/12 px-12 md:px-4 mr-auto ml-auto -mt-32");
    			add_location(div6, file, 77, 2, 2621);
    			attr_dev(i0, "class", "fas fa-sitemap");
    			add_location(i0, file, 120, 5, 4125);
    			attr_dev(div7, "class", "text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white");
    			add_location(div7, file, 117, 6, 3973);
    			attr_dev(h60, "class", "text-xl mb-1 font-semibold");
    			add_location(h60, file, 122, 6, 4175);
    			attr_dev(p2, "class", "mb-4 text-blueGray-500");
    			add_location(p2, file, 125, 6, 4253);
    			attr_dev(div8, "class", "px-4 py-5 flex-auto");
    			add_location(div8, file, 116, 4, 3933);
    			attr_dev(div9, "class", "relative flex flex-col mt-4");
    			add_location(div9, file, 115, 5, 3887);
    			attr_dev(i1, "class", "fas fa-drafting-compass");
    			add_location(i1, file, 136, 5, 4640);
    			attr_dev(div10, "class", "text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white");
    			add_location(div10, file, 133, 6, 4488);
    			attr_dev(h61, "class", "text-xl mb-1 font-semibold");
    			add_location(h61, file, 138, 6, 4699);
    			attr_dev(p3, "class", "mb-4 text-blueGray-500");
    			add_location(p3, file, 141, 6, 4784);
    			attr_dev(div11, "class", "px-4 py-5 flex-auto");
    			add_location(div11, file, 132, 4, 4448);
    			attr_dev(div12, "class", "relative flex flex-col min-w-0");
    			add_location(div12, file, 131, 5, 4399);
    			attr_dev(div13, "class", "w-full md:w-6/12 px-4");
    			add_location(div13, file, 114, 3, 3846);
    			attr_dev(i2, "class", "fab fa-hubspot");
    			add_location(i2, file, 154, 6, 5240);
    			attr_dev(div14, "class", "text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white");
    			add_location(div14, file, 151, 6, 5087);
    			attr_dev(h62, "class", "text-xl mb-1 font-semibold");
    			add_location(h62, file, 156, 6, 5290);
    			attr_dev(p4, "class", "mb-4 text-blueGray-500");
    			add_location(p4, file, 157, 6, 5359);
    			attr_dev(div15, "class", "px-4 py-5 flex-auto");
    			add_location(div15, file, 150, 4, 5047);
    			attr_dev(div16, "class", "relative flex flex-col min-w-0 mt-4");
    			add_location(div16, file, 149, 5, 4993);
    			attr_dev(i3, "class", "fas fa-file-alt");
    			add_location(i3, file, 167, 5, 5759);
    			attr_dev(div17, "class", "text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-12 h-12 mb-5 shadow-lg rounded-full bg-white");
    			add_location(div17, file, 164, 6, 5607);
    			attr_dev(h63, "class", "text-xl mb-1 font-semibold");
    			add_location(h63, file, 169, 6, 5810);
    			attr_dev(p5, "class", "mb-4 text-blueGray-500");
    			add_location(p5, file, 172, 6, 5887);
    			attr_dev(div18, "class", "px-4 py-5 flex-auto");
    			add_location(div18, file, 163, 4, 5567);
    			attr_dev(div19, "class", "relative flex flex-col min-w-0");
    			add_location(div19, file, 162, 5, 5518);
    			attr_dev(div20, "class", "w-full md:w-6/12 px-4");
    			add_location(div20, file, 148, 3, 4952);
    			attr_dev(div21, "class", "flex flex-wrap");
    			add_location(div21, file, 113, 4, 3814);
    			attr_dev(div22, "class", "w-full md:w-6/12 px-4");
    			add_location(div22, file, 112, 2, 3774);
    			attr_dev(div23, "class", "flex flex-wrap items-center");
    			add_location(div23, file, 76, 3, 2577);
    			attr_dev(div24, "class", "container mx-auto");
    			add_location(div24, file, 75, 1, 2542);
    			attr_dev(i4, "class", "fab fa-hubspot text-xl");
    			add_location(i4, file, 190, 3, 6421);
    			attr_dev(div25, "class", "text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-16 h-16 mb-6 shadow-lg rounded-full bg-white");
    			add_location(div25, file, 187, 4, 6275);
    			attr_dev(h30, "class", "text-3xl mb-2 font-semibold leading-normal");
    			add_location(h30, file, 192, 4, 6475);
    			attr_dev(p6, "class", "text-lg font-light leading-relaxed mt-4 mb-4 text-blueGray-600");
    			add_location(p6, file, 195, 4, 6567);
    			attr_dev(span0, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span0, file, 201, 3, 6841);
    			attr_dev(span1, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span1, file, 206, 3, 7017);
    			attr_dev(span2, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span2, file, 211, 3, 7192);
    			attr_dev(span3, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span3, file, 216, 3, 7367);
    			attr_dev(span4, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span4, file, 221, 3, 7541);
    			attr_dev(span5, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span5, file, 226, 3, 7717);
    			attr_dev(span6, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span6, file, 231, 3, 7896);
    			attr_dev(span7, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span7, file, 236, 3, 8077);
    			attr_dev(div26, "class", "block pb-6");
    			add_location(div26, file, 200, 4, 6813);
    			attr_dev(i5, "class", "fa fa-angle-double-right ml-1 leading-relaxed");
    			add_location(i5, file, 248, 3, 8452);
    			attr_dev(a2, "href", "https://github.com/hubly-it");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "class", "font-bold text-blueGray-700 hover:text-blueGray-500 ease-linear transition-all duration-150");
    			add_location(a2, file, 242, 4, 8268);
    			attr_dev(div27, "class", "w-full md:w-4/12 px-12 md:px-4 ml-auto mr-auto mt-48");
    			add_location(div27, file, 186, 2, 6204);
    			attr_dev(img2, "alt", "...");
    			if (!src_url_equal(img2.src, img2_src_value = componentBtn)) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "w-full align-middle rounded absolute shadow-lg max-w-100-px left-145-px -top-29-px z-3");
    			add_location(img2, file, 254, 3, 8673);
    			attr_dev(img3, "alt", "...");
    			if (!src_url_equal(img3.src, img3_src_value = componentProfileCard)) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "w-full align-middle rounded-lg absolute shadow-lg max-w-210-px left-260-px -top-160-px");
    			add_location(img3, file, 259, 3, 8828);
    			attr_dev(img4, "alt", "...");
    			if (!src_url_equal(img4.src, img4_src_value = componentInfoCard)) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "w-full align-middle rounded-lg absolute shadow-lg max-w-180-px left-40-px -top-225-px z-2");
    			add_location(img4, file, 264, 3, 8991);
    			attr_dev(img5, "alt", "...");
    			if (!src_url_equal(img5.src, img5_src_value = componentInfo2)) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "w-full align-middle rounded-lg absolute shadow-2xl max-w-200-px -left-50-px top-25-px");
    			add_location(img5, file, 269, 3, 9154);
    			attr_dev(img6, "alt", "...");
    			if (!src_url_equal(img6.src, img6_src_value = componentMenu)) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "class", "w-full align-middle rounded absolute shadow-lg max-w-580-px -left-20-px top-210-px");
    			add_location(img6, file, 274, 3, 9310);
    			attr_dev(img7, "alt", "...");
    			if (!src_url_equal(img7.src, img7_src_value = componentBtnPink)) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "w-full align-middle rounded absolute shadow-xl max-w-120-px left-195-px top-95-px");
    			add_location(img7, file, 279, 3, 9462);
    			attr_dev(div28, "class", "relative flex flex-col min-w-0 w-full mb-6 mt-48 md:mt-0");
    			add_location(div28, file, 253, 4, 8599);
    			attr_dev(div29, "class", "w-full md:w-5/12 px-4 mr-auto ml-auto mt-32");
    			add_location(div29, file, 252, 2, 8537);
    			attr_dev(div30, "class", "flex flex-wrap items-center");
    			add_location(div30, file, 185, 3, 6160);
    			attr_dev(img8, "alt", "...");
    			attr_dev(img8, "class", "shadow-md rounded-full max-w-full w-16 mx-auto p-2 bg-white");
    			if (!src_url_equal(img8.src, img8_src_value = "https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/svelte.jpg")) attr_dev(img8, "src", img8_src_value);
    			add_location(img8, file, 295, 6, 9941);
    			attr_dev(p7, "class", "text-lg text-white mt-4 font-semibold");
    			add_location(p7, file, 300, 6, 10152);
    			attr_dev(div31, "class", "bg-red-600 shadow-lg rounded-lg text-center p-8");
    			add_location(div31, file, 292, 4, 9862);
    			attr_dev(img9, "alt", "...");
    			attr_dev(img9, "class", "shadow-md rounded-full max-w-full w-16 mx-auto p-2 bg-white");
    			if (!src_url_equal(img9.src, img9_src_value = "https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/react.jpg")) attr_dev(img9, "src", img9_src_value);
    			add_location(img9, file, 305, 6, 10319);
    			attr_dev(p8, "class", "text-lg text-white mt-4 font-semibold");
    			add_location(p8, file, 310, 6, 10529);
    			attr_dev(div32, "class", "bg-lightBlue-500 shadow-lg rounded-lg text-center p-8 mt-8");
    			add_location(div32, file, 304, 4, 10240);
    			attr_dev(img10, "alt", "...");
    			attr_dev(img10, "class", "shadow-md rounded-full max-w-full w-16 mx-auto p-2 bg-white");
    			if (!src_url_equal(img10.src, img10_src_value = "https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/nextjs.jpg")) attr_dev(img10, "src", img10_src_value);
    			add_location(img10, file, 317, 6, 10707);
    			attr_dev(p9, "class", "text-lg text-white mt-4 font-semibold");
    			add_location(p9, file, 322, 6, 10918);
    			attr_dev(div33, "class", "bg-blueGray-700 shadow-lg rounded-lg text-center p-8 mt-8");
    			add_location(div33, file, 314, 4, 10618);
    			attr_dev(div34, "class", "my-4 w-full lg:w-6/12 px-4");
    			add_location(div34, file, 291, 3, 9817);
    			attr_dev(img11, "alt", "...");
    			attr_dev(img11, "class", "shadow-md rounded-full max-w-full w-16 mx-auto p-2 bg-white");
    			if (!src_url_equal(img11.src, img11_src_value = "https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/js.png")) attr_dev(img11, "src", img11_src_value);
    			add_location(img11, file, 329, 6, 11140);
    			attr_dev(p10, "class", "text-lg text-white mt-4 font-semibold");
    			add_location(p10, file, 334, 6, 11347);
    			attr_dev(div35, "class", "bg-yellow-500 shadow-lg rounded-lg text-center p-8");
    			add_location(div35, file, 328, 4, 11069);
    			attr_dev(img12, "alt", "...");
    			attr_dev(img12, "class", "shadow-md rounded-full max-w-full w-16 mx-auto p-2 bg-white");
    			if (!src_url_equal(img12.src, img12_src_value = "https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/angular.jpg")) attr_dev(img12, "src", img12_src_value);
    			add_location(img12, file, 339, 6, 11512);
    			attr_dev(p11, "class", "text-lg text-white mt-4 font-semibold");
    			add_location(p11, file, 344, 6, 11724);
    			attr_dev(div36, "class", "bg-red-700 shadow-lg rounded-lg text-center p-8 mt-8");
    			add_location(div36, file, 338, 4, 11439);
    			attr_dev(img13, "alt", "...");
    			attr_dev(img13, "class", "shadow-md rounded-full max-w-full w-16 mx-auto p-2 bg-white");
    			if (!src_url_equal(img13.src, img13_src_value = "https://raw.githubusercontent.com/creativetimofficial/public-assets/master/logos/vue.jpg")) attr_dev(img13, "src", img13_src_value);
    			add_location(img13, file, 351, 6, 11901);
    			attr_dev(p12, "class", "text-lg text-white mt-4 font-semibold");
    			add_location(p12, file, 356, 6, 12109);
    			attr_dev(div37, "class", "bg-emerald-500 shadow-lg rounded-lg text-center p-8 mt-8");
    			add_location(div37, file, 348, 4, 11813);
    			attr_dev(div38, "class", "my-4 w-full lg:w-6/12 px-4 lg:mt-16");
    			add_location(div38, file, 327, 3, 11015);
    			attr_dev(div39, "class", "justify-center flex flex-wrap relative");
    			add_location(div39, file, 290, 4, 9761);
    			attr_dev(div40, "class", "w-full md:w-6/12 px-4 mr-auto ml-auto mt-32");
    			add_location(div40, file, 289, 2, 9699);
    			attr_dev(i6, "class", "fas fa-drafting-compass text-xl");
    			add_location(i6, file, 368, 3, 12445);
    			attr_dev(div41, "class", "text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-16 h-16 mb-6 shadow-lg rounded-full bg-white");
    			add_location(div41, file, 365, 4, 12299);
    			attr_dev(h31, "class", "text-3xl mb-2 font-semibold leading-normal");
    			add_location(h31, file, 370, 4, 12508);
    			attr_dev(p13, "class", "text-lg font-light leading-relaxed mt-4 mb-4 text-blueGray-600");
    			add_location(p13, file, 373, 4, 12603);
    			attr_dev(p14, "class", "text-lg font-light leading-relaxed mt-4 mb-4 text-blueGray-600");
    			add_location(p14, file, 378, 4, 12872);
    			attr_dev(span8, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span8, file, 382, 3, 13061);
    			attr_dev(span9, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span9, file, 387, 3, 13236);
    			attr_dev(span10, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span10, file, 392, 3, 13414);
    			attr_dev(span11, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span11, file, 397, 3, 13588);
    			attr_dev(span12, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span12, file, 402, 3, 13763);
    			attr_dev(span13, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span13, file, 407, 3, 13939);
    			attr_dev(span14, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span14, file, 412, 3, 14116);
    			attr_dev(span15, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blueGray-500 bg-white uppercase last:mr-0 mr-2 mt-2");
    			add_location(span15, file, 417, 3, 14289);
    			attr_dev(div42, "class", "block pb-6");
    			add_location(div42, file, 381, 4, 13033);
    			attr_dev(i7, "class", "fa fa-angle-double-right ml-1 leading-relaxed");
    			add_location(i7, file, 429, 3, 14662);
    			attr_dev(a3, "href", "https://github.com/hubly-it");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "class", "font-bold text-blueGray-700 hover:text-blueGray-500 ease-linear transition-all duration-150");
    			add_location(a3, file, 423, 4, 14478);
    			attr_dev(div43, "class", "w-full md:w-4/12 px-12 md:px-4 ml-auto mr-auto mt-48");
    			add_location(div43, file, 364, 2, 12228);
    			attr_dev(div44, "class", "flex flex-wrap items-center pt-32");
    			add_location(div44, file, 288, 3, 9649);
    			attr_dev(div45, "class", "container mx-auto overflow-hidden pb-20");
    			add_location(div45, file, 184, 1, 6103);
    			attr_dev(section1, "class", "mt-48 md:mt-40 pb-40 relative bg-blueGray-100");
    			add_location(section1, file, 55, 2, 2058);
    			attr_dev(i8, "class", "fas fa-code-branch text-xl");
    			add_location(i8, file, 444, 3, 15144);
    			attr_dev(div46, "class", "text-blueGray-500 p-3 text-center inline-flex items-center justify-center w-16 h-16 mb-6 shadow-lg rounded-full bg-white");
    			add_location(div46, file, 441, 4, 14998);
    			attr_dev(h32, "class", "text-3xl mb-2 font-semibold leading-normal text-white");
    			add_location(h32, file, 446, 4, 15202);
    			attr_dev(p15, "class", "text-lg font-light leading-relaxed mt-4 mb-4 text-blueGray-400");
    			add_location(p15, file, 449, 4, 15298);
    			attr_dev(a4, "href", "https://github.com/hubly-it");
    			attr_dev(a4, "target", "_blank");
    			attr_dev(a4, "class", "github-star mt-4 inline-block text-white font-bold px-6 py-4 rounded outline-none focus:outline-none mr-1 mb-1 bg-blueGray-700 active:bg-blueGray-600 uppercase text-sm shadow hover:shadow-lg ease-linear transition-all duration-150");
    			add_location(a4, file, 453, 4, 15613);
    			attr_dev(div47, "class", "w-full md:w-5/12 px-12 md:px-4 ml-auto mr-auto md:mt-64");
    			add_location(div47, file, 440, 2, 14924);
    			attr_dev(i9, "class", "fab fa-github text-blueGray-700 text-55 absolute -top-150-px -right-100 left-auto opacity-80");
    			add_location(i9, file, 463, 4, 16025);
    			attr_dev(div48, "class", "w-full md:w-4/12 px-4 mr-auto ml-auto mt-32 relative");
    			add_location(div48, file, 462, 2, 15954);
    			attr_dev(div49, "class", "flex flex-wrap justify-center");
    			add_location(div49, file, 439, 3, 14878);
    			attr_dev(div50, "class", "container mx-auto pb-64");
    			add_location(div50, file, 438, 1, 14837);
    			attr_dev(section2, "class", "py-0 bg-blueGray-600 overflow-hidden");
    			add_location(section2, file, 437, 2, 14781);
    			attr_dev(polygon2, "class", "text-blueGray-200 fill-current");
    			attr_dev(polygon2, "points", "2560 0 2560 100 0 100");
    			add_location(polygon2, file, 485, 2, 16542);
    			attr_dev(svg2, "class", "absolute bottom-0 overflow-hidden");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "preserveAspectRatio", "none");
    			attr_dev(svg2, "version", "1.1");
    			attr_dev(svg2, "viewBox", "0 0 2560 100");
    			attr_dev(svg2, "x", "0");
    			attr_dev(svg2, "y", "0");
    			add_location(svg2, file, 476, 3, 16363);
    			attr_dev(div51, "class", "-mt-20 top-0 bottom-auto left-0 right-0 w-full absolute h-20");
    			set_style(div51, "transform", "translateZ(0)");
    			add_location(div51, file, 472, 1, 16243);
    			attr_dev(section3, "class", "pb-16 bg-blueGray-200 relative pt-32");
    			add_location(section3, file, 471, 2, 16187);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(indexnavbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(div1, t4);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(div0, t6);
    			append_dev(div0, a1);
    			append_dev(section0, t8);
    			append_dev(section0, img0);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div4);
    			append_dev(div4, svg0);
    			append_dev(svg0, polygon0);
    			append_dev(section1, t10);
    			append_dev(section1, div24);
    			append_dev(div24, div23);
    			append_dev(div23, div6);
    			append_dev(div6, div5);
    			append_dev(div5, img1);
    			append_dev(div5, t11);
    			append_dev(div5, blockquote);
    			append_dev(blockquote, svg1);
    			append_dev(svg1, polygon1);
    			append_dev(blockquote, t12);
    			append_dev(blockquote, h4);
    			append_dev(blockquote, t14);
    			append_dev(blockquote, p1);
    			append_dev(div23, t16);
    			append_dev(div23, div22);
    			append_dev(div22, div21);
    			append_dev(div21, div13);
    			append_dev(div13, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, i0);
    			append_dev(div8, t17);
    			append_dev(div8, h60);
    			append_dev(div8, t19);
    			append_dev(div8, p2);
    			append_dev(div13, t21);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, i1);
    			append_dev(div11, t22);
    			append_dev(div11, h61);
    			append_dev(div11, t24);
    			append_dev(div11, p3);
    			append_dev(div21, t26);
    			append_dev(div21, div20);
    			append_dev(div20, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, i2);
    			append_dev(div15, t27);
    			append_dev(div15, h62);
    			append_dev(div15, t29);
    			append_dev(div15, p4);
    			append_dev(div20, t31);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div18, div17);
    			append_dev(div17, i3);
    			append_dev(div18, t32);
    			append_dev(div18, h63);
    			append_dev(div18, t34);
    			append_dev(div18, p5);
    			append_dev(section1, t36);
    			append_dev(section1, div45);
    			append_dev(div45, div30);
    			append_dev(div30, div27);
    			append_dev(div27, div25);
    			append_dev(div25, i4);
    			append_dev(div27, t37);
    			append_dev(div27, h30);
    			append_dev(div27, t39);
    			append_dev(div27, p6);
    			append_dev(div27, t41);
    			append_dev(div27, div26);
    			append_dev(div26, span0);
    			append_dev(div26, t43);
    			append_dev(div26, span1);
    			append_dev(div26, t45);
    			append_dev(div26, span2);
    			append_dev(div26, t47);
    			append_dev(div26, span3);
    			append_dev(div26, t49);
    			append_dev(div26, span4);
    			append_dev(div26, t51);
    			append_dev(div26, span5);
    			append_dev(div26, t53);
    			append_dev(div26, span6);
    			append_dev(div26, t55);
    			append_dev(div26, span7);
    			append_dev(div27, t57);
    			append_dev(div27, a2);
    			append_dev(a2, t58);
    			append_dev(a2, i5);
    			append_dev(div30, t59);
    			append_dev(div30, div29);
    			append_dev(div29, div28);
    			append_dev(div28, img2);
    			append_dev(div28, t60);
    			append_dev(div28, img3);
    			append_dev(div28, t61);
    			append_dev(div28, img4);
    			append_dev(div28, t62);
    			append_dev(div28, img5);
    			append_dev(div28, t63);
    			append_dev(div28, img6);
    			append_dev(div28, t64);
    			append_dev(div28, img7);
    			append_dev(div45, t65);
    			append_dev(div45, div44);
    			append_dev(div44, div40);
    			append_dev(div40, div39);
    			append_dev(div39, div34);
    			append_dev(div34, div31);
    			append_dev(div31, img8);
    			append_dev(div31, t66);
    			append_dev(div31, p7);
    			append_dev(div34, t68);
    			append_dev(div34, div32);
    			append_dev(div32, img9);
    			append_dev(div32, t69);
    			append_dev(div32, p8);
    			append_dev(div34, t71);
    			append_dev(div34, div33);
    			append_dev(div33, img10);
    			append_dev(div33, t72);
    			append_dev(div33, p9);
    			append_dev(div39, t74);
    			append_dev(div39, div38);
    			append_dev(div38, div35);
    			append_dev(div35, img11);
    			append_dev(div35, t75);
    			append_dev(div35, p10);
    			append_dev(div38, t77);
    			append_dev(div38, div36);
    			append_dev(div36, img12);
    			append_dev(div36, t78);
    			append_dev(div36, p11);
    			append_dev(div38, t80);
    			append_dev(div38, div37);
    			append_dev(div37, img13);
    			append_dev(div37, t81);
    			append_dev(div37, p12);
    			append_dev(div44, t83);
    			append_dev(div44, div43);
    			append_dev(div43, div41);
    			append_dev(div41, i6);
    			append_dev(div43, t84);
    			append_dev(div43, h31);
    			append_dev(div43, t86);
    			append_dev(div43, p13);
    			append_dev(div43, t88);
    			append_dev(div43, p14);
    			append_dev(div43, t90);
    			append_dev(div43, div42);
    			append_dev(div42, span8);
    			append_dev(div42, t92);
    			append_dev(div42, span9);
    			append_dev(div42, t94);
    			append_dev(div42, span10);
    			append_dev(div42, t96);
    			append_dev(div42, span11);
    			append_dev(div42, t98);
    			append_dev(div42, span12);
    			append_dev(div42, t100);
    			append_dev(div42, span13);
    			append_dev(div42, t102);
    			append_dev(div42, span14);
    			append_dev(div42, t104);
    			append_dev(div42, span15);
    			append_dev(div43, t106);
    			append_dev(div43, a3);
    			append_dev(a3, t107);
    			append_dev(a3, i7);
    			insert_dev(target, t108, anchor);
    			insert_dev(target, section2, anchor);
    			append_dev(section2, div50);
    			append_dev(div50, div49);
    			append_dev(div49, div47);
    			append_dev(div47, div46);
    			append_dev(div46, i8);
    			append_dev(div47, t109);
    			append_dev(div47, h32);
    			append_dev(div47, t111);
    			append_dev(div47, p15);
    			append_dev(div47, t113);
    			append_dev(div47, a4);
    			append_dev(div49, t115);
    			append_dev(div49, div48);
    			append_dev(div48, i9);
    			insert_dev(target, t116, anchor);
    			insert_dev(target, section3, anchor);
    			append_dev(section3, div51);
    			append_dev(div51, svg2);
    			append_dev(svg2, polygon2);
    			insert_dev(target, t117, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(indexnavbar.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(indexnavbar.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(indexnavbar, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(section1);
    			if (detaching) detach_dev(t108);
    			if (detaching) detach_dev(section2);
    			if (detaching) detach_dev(t116);
    			if (detaching) detach_dev(section3);
    			if (detaching) detach_dev(t117);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const patternVue = "/assets/img/pattern_svelte.png";
    const componentBtn = "/assets/img/component-btn.png";
    const componentProfileCard = "/assets/img/component-profile-card.png";
    const componentInfoCard = "/assets/img/component-info-card.png";
    const componentInfo2 = "/assets/img/component-info-2.png";
    const componentMenu = "/assets/img/component-menu.png";
    const componentBtnPink = "/assets/img/component-btn-pink.png";

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Index', slots, []);
    	let { location } = $$props;
    	const writable_props = ['location'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('location' in $$props) $$invalidate(0, location = $$props.location);
    	};

    	$$self.$capture_state = () => ({
    		IndexNavbar,
    		Footer,
    		patternVue,
    		componentBtn,
    		componentProfileCard,
    		componentInfoCard,
    		componentInfo2,
    		componentMenu,
    		componentBtnPink,
    		location
    	});

    	$$self.$inject_state = $$props => {
    		if ('location' in $$props) $$invalidate(0, location = $$props.location);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [location];
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { location: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*location*/ ctx[0] === undefined && !('location' in props)) {
    			console.warn("<Index> was created without expected prop 'location'");
    		}
    	}

    	get location() {
    		throw new Error("<Index>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set location(value) {
    		throw new Error("<Index>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.3 */

    // (8:2) <Router url="{url}">
    function create_default_slot(ctx) {
    	let route;
    	let current;

    	route = new Route({
    			props: { path: "/", component: Index },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(8:2) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { url = "" } = $$props;
    	const writable_props = ['url'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	$$self.$capture_state = () => ({ Router, Route, Index, url });

    	$$self.$inject_state = $$props => {
    		if ('url' in $$props) $$invalidate(0, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { url: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get url() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.getElementById("app"),
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
