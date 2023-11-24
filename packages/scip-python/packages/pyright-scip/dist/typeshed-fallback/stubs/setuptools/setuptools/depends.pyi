from _typeshed import Incomplete

class Require:
    def __init__(
        self,
        name,
        requested_version,
        module,
        homepage: str = ...,
        attribute: Incomplete | None = ...,
        format: Incomplete | None = ...,
    ) -> None: ...
    def full_name(self): ...
    def version_ok(self, version): ...
    def get_version(self, paths: Incomplete | None = ..., default: str = ...): ...
    def is_present(self, paths: Incomplete | None = ...): ...
    def is_current(self, paths: Incomplete | None = ...): ...

def get_module_constant(module, symbol, default: int = ..., paths: Incomplete | None = ...): ...
def extract_constant(code, symbol, default: int = ...): ...
