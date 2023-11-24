# < definition scip-python python snapshot-util 0.1 actual/__init__:
#documentation (module) actual

import aliased
#      ^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:
import aliased as A
#      ^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:
#                 ^ reference local 0
#                 documentation ```python
#                             > (module) A
#                             > ```

print(A.SOME_CONSTANT)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#external documentation ```python
#            > (function) def print(
#            >     *values: object,
#            >     sep: str | None = " ",
#            >     end: str | None = "\n",
#            >     file: SupportsWrite[str] | None = No...
#            >     flush: Literal[False] = False
#            > ) -> None
#            > ```
#     ^ reference local 0
#       ^^^^^^^^^^^^^ reference  snapshot-util 0.1 aliased/SOME_CONSTANT.

