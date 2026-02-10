"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const web = require("solid-js/web");
const clsx = require("clsx");
const invariant = require("tiny-invariant");
const routerCore = require("@tanstack/router-core");
const solidJs = require("solid-js");
const context = require("./context.cjs");
const useStyles = require("./useStyles.cjs");
const useLocalStorage = require("./useLocalStorage.cjs");
const Explorer = require("./Explorer.cjs");
const utils = require("./utils.cjs");
const AgeTicker = require("./AgeTicker.cjs");
const NavigateButton = require("./NavigateButton.cjs");
var _tmpl$ = /* @__PURE__ */ web.template(`<button><div>TANSTACK</div><div>TanStack Router v1`), _tmpl$2 = /* @__PURE__ */ web.template(`<div><div>`), _tmpl$3 = /* @__PURE__ */ web.template(`<code> `), _tmpl$4 = /* @__PURE__ */ web.template(`<code>`), _tmpl$5 = /* @__PURE__ */ web.template(`<div><div role=button><div>`), _tmpl$6 = /* @__PURE__ */ web.template(`<div>`), _tmpl$7 = /* @__PURE__ */ web.template(`<div><button><svg xmlns=http://www.w3.org/2000/svg width=10 height=6 fill=none viewBox="0 0 10 6"><path stroke=currentColor stroke-linecap=round stroke-linejoin=round stroke-width=1.667 d="M1 1l4 4 4-4"></path></svg></button><div><div></div><div><div></div></div></div><div><div><div><span>Pathname</span></div><div><code></code></div><div><div><button type=button>Routes</button><button type=button>Matches</button></div><div><div>age / staleTime / gcTime</div></div></div><div>`), _tmpl$8 = /* @__PURE__ */ web.template(`<div><span>masked`), _tmpl$9 = /* @__PURE__ */ web.template(`<div role=button><div>`), _tmpl$10 = /* @__PURE__ */ web.template(`<div><div><div>Cached Matches</div><div>age / staleTime / gcTime</div></div><div>`), _tmpl$11 = /* @__PURE__ */ web.template(`<div><div>Match Details</div><div><div><div><div></div></div><div><div>ID:</div><div><code></code></div></div><div><div>State:</div><div></div></div><div><div>Last Updated:</div><div></div></div></div></div><div>Explorer</div><div>`), _tmpl$12 = /* @__PURE__ */ web.template(`<div>Loader Data`), _tmpl$13 = /* @__PURE__ */ web.template(`<div><div>Search Params</div><div>`);
function Logo(props) {
  const {
    className,
    ...rest
  } = props;
  const styles = useStyles.useStyles();
  return (() => {
    var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.nextSibling;
    web.spread(_el$, web.mergeProps(rest, {
      get ["class"]() {
        return clsx.clsx(styles().logo, className ? className() : "");
      }
    }), false, true);
    web.effect((_p$) => {
      var _v$ = styles().tanstackLogo, _v$2 = styles().routerLogo;
      _v$ !== _p$.e && web.className(_el$2, _p$.e = _v$);
      _v$2 !== _p$.t && web.className(_el$3, _p$.t = _v$2);
      return _p$;
    }, {
      e: void 0,
      t: void 0
    });
    return _el$;
  })();
}
function NavigateLink(props) {
  return (() => {
    var _el$4 = _tmpl$2(), _el$5 = _el$4.firstChild;
    _el$4.style.setProperty("display", "flex");
    _el$4.style.setProperty("align-items", "center");
    _el$4.style.setProperty("width", "100%");
    web.insert(_el$4, () => props.left, _el$5);
    _el$5.style.setProperty("flex-grow", "1");
    _el$5.style.setProperty("min-width", "0");
    web.insert(_el$5, () => props.children);
    web.insert(_el$4, () => props.right, null);
    web.effect(() => web.className(_el$4, props.class));
    return _el$4;
  })();
}
function RouteComp({
  routerState,
  router,
  route,
  isRoot,
  activeId,
  setActiveId
}) {
  const styles = useStyles.useStyles();
  const matches = solidJs.createMemo(() => routerState().pendingMatches || routerState().matches);
  const match = solidJs.createMemo(() => routerState().matches.find((d) => d.routeId === route.id));
  const param = solidJs.createMemo(() => {
    var _a, _b;
    try {
      if ((_a = match()) == null ? void 0 : _a.params) {
        const p = (_b = match()) == null ? void 0 : _b.params;
        const r = route.path || routerCore.trimPath(route.id);
        if (r.startsWith("$")) {
          const trimmed = r.slice(1);
          if (p[trimmed]) {
            return `(${p[trimmed]})`;
          }
        }
      }
      return "";
    } catch (error) {
      return "";
    }
  });
  const navigationTarget = solidJs.createMemo(() => {
    if (isRoot) return void 0;
    if (!route.path) return void 0;
    const allParams = Object.assign({}, ...matches().map((m) => m.params));
    const interpolated = routerCore.interpolatePath({
      path: route.fullPath,
      params: allParams,
      leaveWildcards: false,
      leaveParams: false,
      decodeCharMap: router().pathParamsDecodeCharMap
    });
    return !interpolated.isMissingParams ? interpolated.interpolatedPath : void 0;
  });
  return (() => {
    var _el$6 = _tmpl$5(), _el$7 = _el$6.firstChild, _el$8 = _el$7.firstChild;
    _el$7.$$click = () => {
      if (match()) {
        setActiveId(activeId() === route.id ? "" : route.id);
      }
    };
    web.insert(_el$7, web.createComponent(NavigateLink, {
      get ["class"]() {
        return clsx.clsx(styles().routesRow(!!match()));
      },
      get left() {
        return web.createComponent(solidJs.Show, {
          get when() {
            return navigationTarget();
          },
          children: (navigate) => web.createComponent(NavigateButton.NavigateButton, {
            get to() {
              return navigate();
            },
            router
          })
        });
      },
      get right() {
        return web.createComponent(AgeTicker.AgeTicker, {
          get match() {
            return match();
          },
          router
        });
      },
      get children() {
        return [(() => {
          var _el$9 = _tmpl$3(), _el$10 = _el$9.firstChild;
          web.insert(_el$9, () => isRoot ? routerCore.rootRouteId : route.path || routerCore.trimPath(route.id), _el$10);
          web.effect(() => web.className(_el$9, styles().code));
          return _el$9;
        })(), (() => {
          var _el$11 = _tmpl$4();
          web.insert(_el$11, param);
          web.effect(() => web.className(_el$11, styles().routeParamInfo));
          return _el$11;
        })()];
      }
    }), null);
    web.insert(_el$6, (() => {
      var _c$ = web.memo(() => {
        var _a;
        return !!((_a = route.children) == null ? void 0 : _a.length);
      });
      return () => _c$() ? (() => {
        var _el$12 = _tmpl$6();
        web.insert(_el$12, () => [...route.children].sort((a, b) => {
          return a.rank - b.rank;
        }).map((r) => web.createComponent(RouteComp, {
          routerState,
          router,
          route: r,
          activeId,
          setActiveId
        })));
        web.effect(() => web.className(_el$12, styles().nestedRouteRow(!!isRoot)));
        return _el$12;
      })() : null;
    })(), null);
    web.effect((_p$) => {
      var _v$3 = `Open match details for ${route.id}`, _v$4 = clsx.clsx(styles().routesRowContainer(route.id === activeId(), !!match())), _v$5 = clsx.clsx(styles().matchIndicator(utils.getRouteStatusColor(matches(), route)));
      _v$3 !== _p$.e && web.setAttribute(_el$7, "aria-label", _p$.e = _v$3);
      _v$4 !== _p$.t && web.className(_el$7, _p$.t = _v$4);
      _v$5 !== _p$.a && web.className(_el$8, _p$.a = _v$5);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0
    });
    return _el$6;
  })();
}
const BaseTanStackRouterDevtoolsPanel = function BaseTanStackRouterDevtoolsPanel2({
  ...props
}) {
  const {
    isOpen = true,
    setIsOpen,
    handleDragStart,
    router,
    routerState,
    shadowDOMTarget,
    ...panelProps
  } = props;
  const {
    onCloseClick
  } = context.useDevtoolsOnClose();
  const styles = useStyles.useStyles();
  const {
    className,
    style,
    ...otherPanelProps
  } = panelProps;
  invariant(router, "No router was found for the TanStack Router Devtools. Please place the devtools in the <RouterProvider> component tree or pass the router instance to the devtools manually.");
  const [showMatches, setShowMatches] = useLocalStorage("tanstackRouterDevtoolsShowMatches", true);
  const [activeId, setActiveId] = useLocalStorage("tanstackRouterDevtoolsActiveRouteId", "");
  const activeMatch = solidJs.createMemo(() => {
    const matches = [...routerState().pendingMatches ?? [], ...routerState().matches, ...routerState().cachedMatches];
    return matches.find((d) => d.routeId === activeId() || d.id === activeId());
  });
  const hasSearch = solidJs.createMemo(() => Object.keys(routerState().location.search).length);
  const explorerState = solidJs.createMemo(() => {
    return {
      ...router(),
      state: routerState()
    };
  });
  const routerExplorerValue = solidJs.createMemo(() => Object.fromEntries(utils.multiSortBy(Object.keys(explorerState()), ["state", "routesById", "routesByPath", "flatRoutes", "options", "manifest"].map((d) => (dd) => dd !== d)).map((key) => [key, explorerState()[key]]).filter((d) => typeof d[1] !== "function" && !["__store", "basepath", "injectedHtml", "subscribers", "latestLoadPromise", "navigateTimeout", "resetNextScroll", "tempLocationKey", "latestLocation", "routeTree", "history"].includes(d[0]))));
  const activeMatchLoaderData = solidJs.createMemo(() => {
    var _a;
    return (_a = activeMatch()) == null ? void 0 : _a.loaderData;
  });
  const activeMatchValue = solidJs.createMemo(() => activeMatch());
  const locationSearchValue = solidJs.createMemo(() => routerState().location.search);
  return (() => {
    var _el$13 = _tmpl$7(), _el$14 = _el$13.firstChild, _el$15 = _el$14.firstChild, _el$16 = _el$14.nextSibling, _el$17 = _el$16.firstChild, _el$18 = _el$17.nextSibling, _el$19 = _el$18.firstChild, _el$20 = _el$16.nextSibling, _el$21 = _el$20.firstChild, _el$22 = _el$21.firstChild;
    _el$22.firstChild;
    var _el$24 = _el$22.nextSibling, _el$25 = _el$24.firstChild, _el$26 = _el$24.nextSibling, _el$27 = _el$26.firstChild, _el$28 = _el$27.firstChild, _el$29 = _el$28.nextSibling, _el$30 = _el$27.nextSibling, _el$31 = _el$26.nextSibling;
    web.spread(_el$13, web.mergeProps({
      get ["class"]() {
        return clsx.clsx(styles().devtoolsPanel, "TanStackRouterDevtoolsPanel", className ? className() : "");
      },
      get style() {
        return style ? style() : "";
      }
    }, otherPanelProps), false, true);
    web.insert(_el$13, handleDragStart ? (() => {
      var _el$32 = _tmpl$6();
      web.addEventListener(_el$32, "mousedown", handleDragStart, true);
      web.effect(() => web.className(_el$32, styles().dragHandle));
      return _el$32;
    })() : null, _el$14);
    _el$14.$$click = (e) => {
      if (setIsOpen) {
        setIsOpen(false);
      }
      onCloseClick(e);
    };
    web.insert(_el$17, web.createComponent(Logo, {
      "aria-hidden": true,
      onClick: (e) => {
        if (setIsOpen) {
          setIsOpen(false);
        }
        onCloseClick(e);
      }
    }));
    web.insert(_el$19, web.createComponent(Explorer.Explorer, {
      label: "Router",
      value: routerExplorerValue,
      defaultExpanded: {
        state: {},
        context: {},
        options: {}
      },
      filterSubEntries: (subEntries) => {
        return subEntries.filter((d) => typeof d.value() !== "function");
      }
    }));
    web.insert(_el$22, (() => {
      var _c$2 = web.memo(() => !!routerState().location.maskedLocation);
      return () => _c$2() ? (() => {
        var _el$33 = _tmpl$8(), _el$34 = _el$33.firstChild;
        web.effect((_p$) => {
          var _v$24 = styles().maskedBadgeContainer, _v$25 = styles().maskedBadge;
          _v$24 !== _p$.e && web.className(_el$33, _p$.e = _v$24);
          _v$25 !== _p$.t && web.className(_el$34, _p$.t = _v$25);
          return _p$;
        }, {
          e: void 0,
          t: void 0
        });
        return _el$33;
      })() : null;
    })(), null);
    web.insert(_el$25, () => routerState().location.pathname);
    web.insert(_el$24, (() => {
      var _c$3 = web.memo(() => !!routerState().location.maskedLocation);
      return () => _c$3() ? (() => {
        var _el$35 = _tmpl$4();
        web.insert(_el$35, () => {
          var _a;
          return (_a = routerState().location.maskedLocation) == null ? void 0 : _a.pathname;
        });
        web.effect(() => web.className(_el$35, styles().maskedLocation));
        return _el$35;
      })() : null;
    })(), null);
    _el$28.$$click = () => {
      setShowMatches(false);
    };
    _el$29.$$click = () => {
      setShowMatches(true);
    };
    web.insert(_el$31, (() => {
      var _c$4 = web.memo(() => !!!showMatches());
      return () => _c$4() ? web.createComponent(RouteComp, {
        routerState,
        router,
        get route() {
          return router().routeTree;
        },
        isRoot: true,
        activeId,
        setActiveId
      }) : (() => {
        var _el$36 = _tmpl$6();
        web.insert(_el$36, () => {
          var _a, _b;
          return (_b = ((_a = routerState().pendingMatches) == null ? void 0 : _a.length) ? routerState().pendingMatches : routerState().matches) == null ? void 0 : _b.map((match, _i) => {
            return (() => {
              var _el$37 = _tmpl$9(), _el$38 = _el$37.firstChild;
              _el$37.$$click = () => setActiveId(activeId() === match.id ? "" : match.id);
              web.insert(_el$37, web.createComponent(NavigateLink, {
                get left() {
                  return web.createComponent(NavigateButton.NavigateButton, {
                    get to() {
                      return match.pathname;
                    },
                    get params() {
                      return match.params;
                    },
                    get search() {
                      return match.search;
                    },
                    router
                  });
                },
                get right() {
                  return web.createComponent(AgeTicker.AgeTicker, {
                    match,
                    router
                  });
                },
                get children() {
                  var _el$39 = _tmpl$4();
                  web.insert(_el$39, () => `${match.routeId === routerCore.rootRouteId ? routerCore.rootRouteId : match.pathname}`);
                  web.effect(() => web.className(_el$39, styles().matchID));
                  return _el$39;
                }
              }), null);
              web.effect((_p$) => {
                var _v$26 = `Open match details for ${match.id}`, _v$27 = clsx.clsx(styles().matchRow(match === activeMatch())), _v$28 = clsx.clsx(styles().matchIndicator(utils.getStatusColor(match)));
                _v$26 !== _p$.e && web.setAttribute(_el$37, "aria-label", _p$.e = _v$26);
                _v$27 !== _p$.t && web.className(_el$37, _p$.t = _v$27);
                _v$28 !== _p$.a && web.className(_el$38, _p$.a = _v$28);
                return _p$;
              }, {
                e: void 0,
                t: void 0,
                a: void 0
              });
              return _el$37;
            })();
          });
        });
        return _el$36;
      })();
    })());
    web.insert(_el$20, (() => {
      var _c$5 = web.memo(() => !!routerState().cachedMatches.length);
      return () => _c$5() ? (() => {
        var _el$40 = _tmpl$10(), _el$41 = _el$40.firstChild, _el$42 = _el$41.firstChild, _el$43 = _el$42.nextSibling, _el$44 = _el$41.nextSibling;
        web.insert(_el$44, () => routerState().cachedMatches.map((match) => {
          return (() => {
            var _el$45 = _tmpl$9(), _el$46 = _el$45.firstChild;
            _el$45.$$click = () => setActiveId(activeId() === match.id ? "" : match.id);
            web.insert(_el$45, web.createComponent(NavigateLink, {
              get left() {
                return web.createComponent(NavigateButton.NavigateButton, {
                  get to() {
                    return match.pathname;
                  },
                  get params() {
                    return match.params;
                  },
                  get search() {
                    return match.search;
                  },
                  router
                });
              },
              get right() {
                return web.createComponent(AgeTicker.AgeTicker, {
                  match,
                  router
                });
              },
              get children() {
                var _el$47 = _tmpl$4();
                web.insert(_el$47, () => `${match.id}`);
                web.effect(() => web.className(_el$47, styles().matchID));
                return _el$47;
              }
            }), null);
            web.effect((_p$) => {
              var _v$32 = `Open match details for ${match.id}`, _v$33 = clsx.clsx(styles().matchRow(match === activeMatch())), _v$34 = clsx.clsx(styles().matchIndicator(utils.getStatusColor(match)));
              _v$32 !== _p$.e && web.setAttribute(_el$45, "aria-label", _p$.e = _v$32);
              _v$33 !== _p$.t && web.className(_el$45, _p$.t = _v$33);
              _v$34 !== _p$.a && web.className(_el$46, _p$.a = _v$34);
              return _p$;
            }, {
              e: void 0,
              t: void 0,
              a: void 0
            });
            return _el$45;
          })();
        }));
        web.effect((_p$) => {
          var _v$29 = styles().cachedMatchesContainer, _v$30 = styles().detailsHeader, _v$31 = styles().detailsHeaderInfo;
          _v$29 !== _p$.e && web.className(_el$40, _p$.e = _v$29);
          _v$30 !== _p$.t && web.className(_el$41, _p$.t = _v$30);
          _v$31 !== _p$.a && web.className(_el$43, _p$.a = _v$31);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$40;
      })() : null;
    })(), null);
    web.insert(_el$13, (() => {
      var _c$6 = web.memo(() => {
        var _a;
        return !!(activeMatch() && ((_a = activeMatch()) == null ? void 0 : _a.status));
      });
      return () => _c$6() ? (() => {
        var _el$48 = _tmpl$11(), _el$49 = _el$48.firstChild, _el$50 = _el$49.nextSibling, _el$51 = _el$50.firstChild, _el$52 = _el$51.firstChild, _el$53 = _el$52.firstChild, _el$54 = _el$52.nextSibling, _el$55 = _el$54.firstChild, _el$56 = _el$55.nextSibling, _el$57 = _el$56.firstChild, _el$58 = _el$54.nextSibling, _el$59 = _el$58.firstChild, _el$60 = _el$59.nextSibling, _el$61 = _el$58.nextSibling, _el$62 = _el$61.firstChild, _el$63 = _el$62.nextSibling, _el$64 = _el$50.nextSibling, _el$65 = _el$64.nextSibling;
        web.insert(_el$53, (() => {
          var _c$8 = web.memo(() => {
            var _a, _b;
            return !!(((_a = activeMatch()) == null ? void 0 : _a.status) === "success" && ((_b = activeMatch()) == null ? void 0 : _b.isFetching));
          });
          return () => {
            var _a;
            return _c$8() ? "fetching" : (_a = activeMatch()) == null ? void 0 : _a.status;
          };
        })());
        web.insert(_el$57, () => {
          var _a;
          return (_a = activeMatch()) == null ? void 0 : _a.id;
        });
        web.insert(_el$60, (() => {
          var _c$9 = web.memo(() => {
            var _a;
            return !!((_a = routerState().pendingMatches) == null ? void 0 : _a.find((d) => {
              var _a2;
              return d.id === ((_a2 = activeMatch()) == null ? void 0 : _a2.id);
            }));
          });
          return () => _c$9() ? "Pending" : routerState().matches.find((d) => {
            var _a;
            return d.id === ((_a = activeMatch()) == null ? void 0 : _a.id);
          }) ? "Active" : "Cached";
        })());
        web.insert(_el$63, (() => {
          var _c$10 = web.memo(() => {
            var _a;
            return !!((_a = activeMatch()) == null ? void 0 : _a.updatedAt);
          });
          return () => {
            var _a;
            return _c$10() ? new Date((_a = activeMatch()) == null ? void 0 : _a.updatedAt).toLocaleTimeString() : "N/A";
          };
        })());
        web.insert(_el$48, (() => {
          var _c$11 = web.memo(() => !!activeMatchLoaderData());
          return () => _c$11() ? [(() => {
            var _el$66 = _tmpl$12();
            web.effect(() => web.className(_el$66, styles().detailsHeader));
            return _el$66;
          })(), (() => {
            var _el$67 = _tmpl$6();
            web.insert(_el$67, web.createComponent(Explorer.Explorer, {
              label: "loaderData",
              value: activeMatchLoaderData,
              defaultExpanded: {}
            }));
            web.effect(() => web.className(_el$67, styles().detailsContent));
            return _el$67;
          })()] : null;
        })(), _el$64);
        web.insert(_el$65, web.createComponent(Explorer.Explorer, {
          label: "Match",
          value: activeMatchValue,
          defaultExpanded: {}
        }));
        web.effect((_p$) => {
          var _a, _b;
          var _v$35 = styles().thirdContainer, _v$36 = styles().detailsHeader, _v$37 = styles().matchDetails, _v$38 = styles().matchStatus((_a = activeMatch()) == null ? void 0 : _a.status, (_b = activeMatch()) == null ? void 0 : _b.isFetching), _v$39 = styles().matchDetailsInfoLabel, _v$40 = styles().matchDetailsInfo, _v$41 = styles().matchDetailsInfoLabel, _v$42 = styles().matchDetailsInfo, _v$43 = styles().matchDetailsInfoLabel, _v$44 = styles().matchDetailsInfo, _v$45 = styles().detailsHeader, _v$46 = styles().detailsContent;
          _v$35 !== _p$.e && web.className(_el$48, _p$.e = _v$35);
          _v$36 !== _p$.t && web.className(_el$49, _p$.t = _v$36);
          _v$37 !== _p$.a && web.className(_el$51, _p$.a = _v$37);
          _v$38 !== _p$.o && web.className(_el$52, _p$.o = _v$38);
          _v$39 !== _p$.i && web.className(_el$54, _p$.i = _v$39);
          _v$40 !== _p$.n && web.className(_el$56, _p$.n = _v$40);
          _v$41 !== _p$.s && web.className(_el$58, _p$.s = _v$41);
          _v$42 !== _p$.h && web.className(_el$60, _p$.h = _v$42);
          _v$43 !== _p$.r && web.className(_el$61, _p$.r = _v$43);
          _v$44 !== _p$.d && web.className(_el$63, _p$.d = _v$44);
          _v$45 !== _p$.l && web.className(_el$64, _p$.l = _v$45);
          _v$46 !== _p$.u && web.className(_el$65, _p$.u = _v$46);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0,
          o: void 0,
          i: void 0,
          n: void 0,
          s: void 0,
          h: void 0,
          r: void 0,
          d: void 0,
          l: void 0,
          u: void 0
        });
        return _el$48;
      })() : null;
    })(), null);
    web.insert(_el$13, (() => {
      var _c$7 = web.memo(() => !!hasSearch());
      return () => _c$7() ? (() => {
        var _el$68 = _tmpl$13(), _el$69 = _el$68.firstChild, _el$70 = _el$69.nextSibling;
        web.insert(_el$70, web.createComponent(Explorer.Explorer, {
          value: locationSearchValue,
          get defaultExpanded() {
            return Object.keys(routerState().location.search).reduce((obj, next) => {
              obj[next] = {};
              return obj;
            }, {});
          }
        }));
        web.effect((_p$) => {
          var _v$47 = styles().fourthContainer, _v$48 = styles().detailsHeader, _v$49 = styles().detailsContent;
          _v$47 !== _p$.e && web.className(_el$68, _p$.e = _v$47);
          _v$48 !== _p$.t && web.className(_el$69, _p$.t = _v$48);
          _v$49 !== _p$.a && web.className(_el$70, _p$.a = _v$49);
          return _p$;
        }, {
          e: void 0,
          t: void 0,
          a: void 0
        });
        return _el$68;
      })() : null;
    })(), null);
    web.effect((_p$) => {
      var _v$6 = styles().panelCloseBtn, _v$7 = styles().panelCloseBtnIcon, _v$8 = styles().firstContainer, _v$9 = styles().row, _v$10 = styles().routerExplorerContainer, _v$11 = styles().routerExplorer, _v$12 = styles().secondContainer, _v$13 = styles().matchesContainer, _v$14 = styles().detailsHeader, _v$15 = styles().detailsContent, _v$16 = styles().detailsHeader, _v$17 = styles().routeMatchesToggle, _v$18 = !showMatches(), _v$19 = clsx.clsx(styles().routeMatchesToggleBtn(!showMatches(), true)), _v$20 = showMatches(), _v$21 = clsx.clsx(styles().routeMatchesToggleBtn(!!showMatches(), false)), _v$22 = styles().detailsHeaderInfo, _v$23 = clsx.clsx(styles().routesContainer);
      _v$6 !== _p$.e && web.className(_el$14, _p$.e = _v$6);
      _v$7 !== _p$.t && web.setAttribute(_el$15, "class", _p$.t = _v$7);
      _v$8 !== _p$.a && web.className(_el$16, _p$.a = _v$8);
      _v$9 !== _p$.o && web.className(_el$17, _p$.o = _v$9);
      _v$10 !== _p$.i && web.className(_el$18, _p$.i = _v$10);
      _v$11 !== _p$.n && web.className(_el$19, _p$.n = _v$11);
      _v$12 !== _p$.s && web.className(_el$20, _p$.s = _v$12);
      _v$13 !== _p$.h && web.className(_el$21, _p$.h = _v$13);
      _v$14 !== _p$.r && web.className(_el$22, _p$.r = _v$14);
      _v$15 !== _p$.d && web.className(_el$24, _p$.d = _v$15);
      _v$16 !== _p$.l && web.className(_el$26, _p$.l = _v$16);
      _v$17 !== _p$.u && web.className(_el$27, _p$.u = _v$17);
      _v$18 !== _p$.c && (_el$28.disabled = _p$.c = _v$18);
      _v$19 !== _p$.w && web.className(_el$28, _p$.w = _v$19);
      _v$20 !== _p$.m && (_el$29.disabled = _p$.m = _v$20);
      _v$21 !== _p$.f && web.className(_el$29, _p$.f = _v$21);
      _v$22 !== _p$.y && web.className(_el$30, _p$.y = _v$22);
      _v$23 !== _p$.g && web.className(_el$31, _p$.g = _v$23);
      return _p$;
    }, {
      e: void 0,
      t: void 0,
      a: void 0,
      o: void 0,
      i: void 0,
      n: void 0,
      s: void 0,
      h: void 0,
      r: void 0,
      d: void 0,
      l: void 0,
      u: void 0,
      c: void 0,
      w: void 0,
      m: void 0,
      f: void 0,
      y: void 0,
      g: void 0
    });
    return _el$13;
  })();
};
web.delegateEvents(["click", "mousedown"]);
exports.BaseTanStackRouterDevtoolsPanel = BaseTanStackRouterDevtoolsPanel;
exports.default = BaseTanStackRouterDevtoolsPanel;
//# sourceMappingURL=BaseTanStackRouterDevtoolsPanel.cjs.map
