import threading
from collections.abc import Iterator
from types import TracebackType
from typing import Protocol
from typing_extensions import Literal, Self

__version__: str

class _Stream(Protocol):
    def isatty(self) -> bool: ...
    def flush(self) -> None: ...
    def write(self, s: str) -> int: ...

class Spinner:
    spinner_cycle: Iterator[str]
    disable: bool
    beep: bool
    force: bool
    stream: _Stream
    stop_running: threading.Event | None
    spin_thread: threading.Thread | None
    def __init__(self, beep: bool = ..., disable: bool = ..., force: bool = ..., stream: _Stream = ...) -> None: ...
    def start(self) -> None: ...
    def stop(self) -> None: ...
    def init_spin(self) -> None: ...
    def __enter__(self) -> Self: ...
    def __exit__(
        self, exc_type: type[BaseException] | None, exc_val: BaseException | None, exc_tb: TracebackType | None
    ) -> Literal[False]: ...

def spinner(beep: bool = ..., disable: bool = ..., force: bool = ..., stream: _Stream = ...) -> Spinner: ...
