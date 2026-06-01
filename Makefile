.PHONY: dev-backend dev-frontend docker-up git-status

dev-backend:
	cd backend && ./scripts/dev.sh

dev-frontend:
	cd frontend && npm run dev

docker-up:
	docker compose up --build

git-status:
	@echo "=== Staged / unstaged summary ==="
	@git status -sb
	@echo ""
	@echo "=== Tracked runtime files (should be empty) ==="
	@git ls-files backend/storage backend/.venv frontend/node_modules 2>/dev/null || true
	@echo ""
	@echo "To stage all restructure changes: git add -A"
