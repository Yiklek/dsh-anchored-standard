window.__ModuleLoader__.load({
	id: "dsh-anchored-standard",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");

		const NS = "anchoredPresets";
		const CSS = [
			".aps-wrap { display: flex; flex-direction: column; gap: 12px; max-width: 760px; }",
			".aps-hint { color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.6; margin: 0; }",
			".aps-row { display: flex; align-items: flex-start; gap: 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 10px 12px; background: rgba(127,127,127,.04); }",
			".aps-check { accent-color: var(--dsw-alias-state-business-primary); width: 15px; height: 15px; flex: none; margin-top: 3px; cursor: pointer; }",
			".aps-main { flex: 1; min-width: 0; }",
			".aps-name { font-weight: 600; font-size: 13px; color: var(--dsw-alias-label-primary); }",
			".aps-id { font-size: 11px; opacity: .6; margin-top: 2px; word-break: break-all; }",
			".aps-desc { font-size: 12px; color: var(--dsw-alias-label-secondary); margin-top: 4px; line-height: 1.5; }",
			".aps-badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); white-space: nowrap; flex: none; }",
			".aps-badge.aps-on { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }",
			".aps-badge.aps-off { color: var(--dsw-alias-label-tertiary); }",
			".aps-actions { display: flex; align-items: center; gap: 8px; }",
			".aps-btn { border: none; border-radius: 8px; padding: 6px 16px; cursor: pointer; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 13px; white-space: nowrap; }",
			".aps-btn:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }",
			".aps-btn.aps-ghost { background: transparent; border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); }",
			".aps-btn.aps-ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }",
			".aps-btn.aps-select-all { min-width: 88px; text-align: center; }",
			".aps-btn:disabled { opacity: .45; cursor: default; }",
			".aps-msg { font-size: 12px; margin: 0; }",
			".aps-msg.ok { color: var(--dsw-alias-state-success-primary); }",
			".aps-msg.err { color: var(--dsw-alias-state-error-primary); }",
			".aps-load { color: var(--dsw-alias-label-secondary); font-size: 13px; }",
		].join("\n");

		function insertStyles() {
			const el = document.createElement("style");
			el.setAttribute("data-dsh-plugin", "dsh-anchored-standard");
			el.textContent = CSS;
			document.head.appendChild(el);
			return () => el.remove();
		}

		function errText(error) {
			if (error !== null && typeof error === "object" && typeof error.message === "string" && error.message !== "") return error.message;
			return String(error);
		}

		function rpcCall(connection, method, args) {
			if (connection === undefined || connection === null || connection.rpc === undefined
				|| typeof connection.rpc.call !== "function") {
				return Promise.reject(new Error("anchored-presets: connection service unavailable"));
			}
			return connection.rpc.call("/api", "anchoredPresets/" + method, { args }).then((result) => {
				if (result !== null && typeof result === "object" && result.ok === true) return result.value;
				const failure = result !== null && typeof result === "object" && result.error !== undefined ? result.error : undefined;
				const text = failure !== undefined && typeof failure.message === "string" && failure.message !== ""
					? failure.message
					: (failure !== undefined && failure.code ? String(failure.code) : "rpc failed");
				throw new Error(text);
			});
		}

		function Section(props) {
			const connection = props.connection;
			const [rows, setRows] = React.useState(null);
			const [selected, setSelected] = React.useState({});
			const [busy, setBusy] = React.useState(false);
			const [message, setMessage] = React.useState(null);
			const [error, setError] = React.useState(null);

			function load() {
				rpcCall(connection, "list", {}).then((value) => {
					const nextRows = value !== null && typeof value === "object" && Array.isArray(value.rows) ? value.rows : [];
					const nextSelected = {};
					for (const row of nextRows) {
						if (row.installed === true) nextSelected[row.id] = true;
					}
					setRows(nextRows);
					setSelected(nextSelected);
					setError(null);
				}, (err) => {
					setError(errText(err));
				});
			}

			React.useEffect(() => {
				load();
			}, []);

			const dirty = rows !== null && rows.some((row) => (selected[row.id] === true) !== (row.installed === true));

			function toggle(id) {
				setSelected((prev) => {
					const next = { ...prev };
					if (next[id] === true) delete next[id];
					else next[id] = true;
					return next;
				});
			}

			function toggleSelectAll() {
				if (rows === null) return;
				const all = rows.every((row) => selected[row.id] === true);
				const next = {};
				if (!all) {
					for (const row of rows) next[row.id] = true;
				}
				setSelected(next);
			}

			function apply() {
				if (rows === null || busy) return;
				const ids = rows.filter((row) => selected[row.id] === true).map((row) => row.id);
				setBusy(true);
				setMessage(null);
				rpcCall(connection, "apply", { ids }).then((value) => {
					setBusy(false);
					const results = value !== null && typeof value === "object" && Array.isArray(value.results) ? value.results : [];
					const failed = results.filter((r) => r === null || typeof r !== "object" || r.ok !== true);
					if (failed.length > 0) {
						setMessage({
							kind: "err",
							text: "部分操作失败: " + failed.map((r) => (r !== null && typeof r === "object" ? r.id + ": " + (r.error || "unknown") : "unknown")).join("; "),
						});
					} else {
						setMessage({ kind: "ok", text: "已应用 preset 安装状态。" });
					}
					load();
				}, (err) => {
					setBusy(false);
					setMessage({ kind: "err", text: "应用失败:" + errText(err) });
				});
			}

			if (error !== null) {
				return React.createElement("div", { className: "aps-wrap" },
					React.createElement("p", { className: "aps-msg err" }, "加载失败:" + error));
			}
			if (rows === null) {
				return React.createElement("div", { className: "aps-wrap" },
					React.createElement("span", { className: "aps-load" }, "加载中…"));
			}

			const allSelected = rows.length > 0 && rows.every((row) => selected[row.id] === true);

			const children = [
				React.createElement("p", { className: "aps-hint", key: "hint" },
					"选择要安装到 ~/.dsh/.agent-presets 的 Anchored Standard preset。勾选后点击“应用更改”即可安装；取消勾选已安装的 preset 会将其卸载。"),
				React.createElement("div", { className: "aps-actions", key: "actions" },
					React.createElement("button", {
						className: "aps-btn aps-ghost aps-select-all",
						disabled: busy || rows.length === 0,
						onClick: toggleSelectAll,
					}, allSelected ? "取消全选" : "全选"),
					React.createElement("button", {
						className: "aps-btn",
						disabled: busy || !dirty,
						onClick: apply,
					}, busy ? "处理中…" : "应用更改")),
			];
			for (const row of rows) {
				const checked = selected[row.id] === true;
				children.push(React.createElement("div", { className: "aps-row", key: row.id },
					React.createElement("input", {
						className: "aps-check",
						type: "checkbox",
						checked: checked,
						disabled: busy,
						onChange: () => toggle(row.id),
					}),
					React.createElement("div", { className: "aps-main" },
						React.createElement("div", { className: "aps-name" }, row.name || row.id),
						React.createElement("div", { className: "aps-id" }, row.id + " (" + row.source + ")"),
						row.description !== "" ? React.createElement("div", { className: "aps-desc" }, row.description) : null),
					React.createElement("span", { className: "aps-badge " + (row.installed === true ? "aps-on" : "aps-off") },
						row.installed === true ? "已安装" : "未安装")));
			}
			if (message !== null) {
				children.push(React.createElement("p", { className: "aps-msg " + message.kind, key: "msg" }, message.text));
			}
			return React.createElement("div", { className: "aps-wrap" }, children);
		}

		function apply(ctx) {
			ctx.effect(() => insertStyles(), "anchored-standard: styles");
			const connection = ctx.connection;
			ctx.slots.inject("settings.section", () => ctx.slots.register(
				{ name: "settings.section", id: "anchored-presets", order: 90, label: "Anchored Presets" },
				() => React.createElement(Section, { connection: connection })
			));
		}

		exports.apply = apply;
		exports.inject = ["slots", "connection"];
		return module.exports;
	}
});
