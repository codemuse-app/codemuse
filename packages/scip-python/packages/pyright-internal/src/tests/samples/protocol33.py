# This sample tests a protocol matching case that involves
# a union of TypeVars.

from typing import Generic, TypeVar, Union, Protocol

T = TypeVar("T")
U = TypeVar("U")


class AProto(Generic[T, U], Protocol):
    def f(self) -> Union[T, U]:
        ...

    def g(self) -> "AProto[T, U]":
        ...


class A(Generic[T, U]):
    def f(self) -> Union[T, U]:
        raise NotImplementedError

    def g(self) -> AProto[T, U]:
        return A[T, U]()


class BProto(Generic[T, U], Protocol):
    def f(self) -> Union[T, U]:
        ...

    def g(self) -> "BProto[T, U]":
        ...


class B(Generic[T, U]):
    def f(self) -> Union[T, U]:
        raise NotImplementedError

    def g(self) -> BProto[T, U]:
        return B[T, U]()
