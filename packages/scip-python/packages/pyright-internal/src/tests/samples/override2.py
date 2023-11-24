# This sample tests the reportImplicitOverride diagnostic check
# (strict enforcement of PEP 698).

from typing_extensions import override


class Base:
    @override
    def __init__(self):
        pass

    def method1(self):
        pass

    @property
    def prop_c(self) -> int:
        return 0


class Child(Base):
    def __init__(self):
        pass

    # This should generate an error if reportImplicitOverride is enabled.
    def method1(self):
        pass

    @property
    # This should generate an error if reportImplicitOverride is enabled.
    def prop_c(self) -> int:
        return 0
