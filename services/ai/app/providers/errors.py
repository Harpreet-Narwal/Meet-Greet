class ProviderNotConfiguredError(RuntimeError):
    """Raised when an endpoint needs a model the operator hasn't configured.

    Translated to a 503 with a clear error body — never crashes the stack
    (IMPLEMENTATION_PLAN.md §4).
    """

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail
